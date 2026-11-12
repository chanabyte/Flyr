import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { tokenStore } from "./tokenStore.js";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events", // create events, nothing else
  "openid",
  "email", // only to show "Signed in as ..." in the app
];

/** Google sign-in is optional: OCR still works if these aren't set yet. */
export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.PUBLIC_URL);
}

function redirectUri() {
  return `${process.env.PUBLIC_URL!.replace(/\/$/, "")}/auth/google/callback`;
}

function newClient() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: redirectUri(),
  });
}

/**
 * Sign-ins in progress. `state` is a random one-time value we send to Google
 * and check when Google sends the user back, so nobody can forge a callback.
 */
const pending = new Map<string, { deviceId: string; returnTo: string; expires: number }>();
const TEN_MINUTES = 10 * 60 * 1000;

/** Only send people back into the app (Expo Go "exp://" or our "flyr://" scheme), never to a website. */
export function isAppUrl(url: string): boolean {
  return /^(exp|exps|flyr):\/\//.test(url);
}

/** Step 1: build the Google consent URL the phone's browser opens. */
export function startSignIn(deviceId: string, returnTo: string): string {
  const state = randomBytes(24).toString("hex");
  pending.set(state, { deviceId, returnTo, expires: Date.now() + TEN_MINUTES });
  return newClient().generateAuthUrl({
    access_type: "offline", // get a refresh token, so the user stays signed in
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

/** Step 2: Google redirects back with a one-time code; trade it for tokens and save them. */
export async function finishSignIn(code: string, state: string): Promise<{ returnTo: string }> {
  const entry = pending.get(state);
  pending.delete(state);
  if (!entry || entry.expires < Date.now()) throw new Error("Sign-in expired or invalid");

  const client = newClient();
  const { tokens } = await client.getToken(code);
  let email: string | undefined;
  if (tokens.id_token) {
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    email = ticket.getPayload()?.email;
  }
  tokenStore.set(entry.deviceId, { tokens, email });
  return { returnTo: entry.returnTo };
}

/** Looks up the returnTo for a state without consuming it (used when the user cancels on Google's page). */
export function cancelSignIn(state: string): string | undefined {
  const entry = pending.get(state);
  pending.delete(state);
  return entry?.returnTo;
}

export class NotSignedInError extends Error {}

/** An OAuth client for this device that refreshes expired access tokens automatically. */
export function clientFor(deviceId: string): OAuth2Client {
  const stored = tokenStore.get(deviceId);
  if (!stored) throw new NotSignedInError("Not signed in to Google");
  const client = newClient();
  client.setCredentials(stored.tokens);
  client.on("tokens", (t) => tokenStore.mergeTokens(deviceId, t));
  return client;
}

export async function signOut(deviceId: string) {
  const stored = tokenStore.get(deviceId);
  tokenStore.delete(deviceId);
  // Also revoke at Google, so the token stops working everywhere
  const token = stored?.tokens.refresh_token ?? stored?.tokens.access_token;
  if (token) await newClient().revokeToken(token).catch(() => {});
}
