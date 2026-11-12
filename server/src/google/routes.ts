import { Router, type Request } from "express";
import { cancelSignIn, finishSignIn, googleConfigured, isAppUrl, NotSignedInError, signOut, startSignIn } from "./auth.js";
import { insertEvent } from "./calendar.js";
import { tokenStore } from "./tokenStore.js";
import type { CalendarEvent } from "../types.js";

export const googleRouter = Router();

/**
 * Each phone identifies itself with a random ID it generates once and keeps in
 * secure storage. The server keys that phone's Google tokens by this ID.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function deviceIdOf(req: Request): string | null {
  const id = req.header("x-device-id") ?? (typeof req.query.deviceId === "string" ? req.query.deviceId : "");
  return UUID.test(id) ? id : null;
}

const NOT_CONFIGURED = "Google sign-in isn't set up on the server yet (see README: Google Calendar setup).";

/** Is this phone signed in? */
googleRouter.get("/auth/status", (req, res) => {
  const deviceId = deviceIdOf(req);
  if (!deviceId) return void res.status(400).json({ error: "Missing device ID" });
  const stored = tokenStore.get(deviceId);
  res.json({ configured: googleConfigured(), signedIn: Boolean(stored), email: stored?.email ?? null });
});

/** Step 1: the app asks for the Google consent URL, then opens it in the browser. */
googleRouter.get("/auth/google/start", (req, res) => {
  if (!googleConfigured()) return void res.status(503).json({ error: NOT_CONFIGURED });
  const deviceId = deviceIdOf(req);
  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "";
  if (!deviceId || !isAppUrl(returnTo)) return void res.status(400).json({ error: "Bad deviceId or returnTo" });
  res.json({ url: startSignIn(deviceId, returnTo) });
});

/** Step 2: Google sends the browser here (via the HTTPS tunnel) after the user approves or cancels. */
googleRouter.get("/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (!state) return void res.status(400).send("Missing state");

  if (error || !code) {
    const returnTo = cancelSignIn(state);
    return void (returnTo ? sendBackToApp(res, returnTo, { status: "error", message: error ?? "cancelled" }) : res.status(400).send("Sign-in cancelled"));
  }

  try {
    const { returnTo } = await finishSignIn(code, state);
    sendBackToApp(res, returnTo, { status: "ok" });
  } catch (err) {
    console.error("Google sign-in failed:", (err as Error).message);
    res.status(400).send(`Sign-in failed: ${escapeHtml((err as Error).message)}. Close this tab and try again.`);
  }
});

googleRouter.post("/auth/signout", async (req, res) => {
  const deviceId = deviceIdOf(req);
  if (!deviceId) return void res.status(400).json({ error: "Missing device ID" });
  await signOut(deviceId);
  res.json({ ok: true });
});

/** Calendar API events.insert with the event JSON from the review screen. */
googleRouter.post("/calendar/events", async (req, res) => {
  if (!googleConfigured()) return void res.status(503).json({ error: NOT_CONFIGURED });
  const deviceId = deviceIdOf(req);
  if (!deviceId) return void res.status(400).json({ error: "Missing device ID" });

  const event = (req.body as { event?: CalendarEvent }).event;
  if (!event?.summary || !event.start || !event.end) {
    return void res.status(400).json({ error: "event with summary, start and end is required" });
  }

  try {
    const created = await insertEvent(deviceId, event);
    console.log(`Created calendar event ${created.id}`);
    res.json(created);
  } catch (err) {
    if (err instanceof NotSignedInError) return void res.status(401).json({ error: err.message });
    const e = err as { message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
    console.error("Calendar insert failed:", e.response?.data?.error?.message ?? e.message);
    res.status(502).json({ error: e.response?.data?.error?.message ?? "Google Calendar rejected the event" });
  }
});

/**
 * Redirect the browser back into the app with the result. Also shows a button,
 * in case the browser doesn't follow the automatic redirect to an app link.
 */
function sendBackToApp(res: import("express").Response, returnTo: string, params: Record<string, string>) {
  const url = new URL(returnTo);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const href = escapeHtml(url.toString());
  res.send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Back to Flyr</title>
<body style="font-family:system-ui;text-align:center;padding:48px 24px">
<p>${params.status === "ok" ? "Signed in! Returning to Flyr…" : "Sign-in cancelled."}</p>
<p><a href="${href}" style="display:inline-block;padding:14px 24px;background:#1a73e8;color:#fff;border-radius:12px;text-decoration:none">Open Flyr</a></p>
<script>location.replace(${JSON.stringify(url.toString()).replace(/</g, "\\u003c")})</script>`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
