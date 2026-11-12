import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { getDeviceId } from "./device";
import type { CalendarEvent, ExtractResponse } from "./types";

/**
 * Where the Flyr server lives.
 * - Set EXPO_PUBLIC_API_URL in mobile/.env (e.g. your ngrok https address) to use that.
 * - Otherwise we use the computer running `expo start` on port 3000, which only
 *   works when the phone and laptop are on the same Wi-Fi and it allows that.
 */
function apiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:3000`;
}

/** fetch() against our server, with this phone's device ID and JSON error handling. */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": await getDeviceId(),
        "ngrok-skip-browser-warning": "1", // ngrok's free plan otherwise returns a warning page
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      `Can't reach the Flyr server at ${apiUrl()}. Is it running? On school or public Wi-Fi, ` +
        "set EXPO_PUBLIC_API_URL in mobile/.env to your ngrok address.",
      0,
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Server error ${res.status}`, res.status);
  return data as T;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Sends the photo to the server, which cleans it up, runs OCR and then Gemini. */
export function extractEvent(imageBase64: string): Promise<ExtractResponse> {
  return call("/extract", {
    method: "POST",
    body: JSON.stringify({ imageBase64, today: todayLocal(), timeZone: deviceTimeZone() }),
  });
}

// ---------- Google sign-in + Calendar ----------

export interface AuthStatus {
  /** false until GOOGLE_CLIENT_ID / SECRET / PUBLIC_URL are set in server/.env */
  configured: boolean;
  signedIn: boolean;
  email: string | null;
}

export const getAuthStatus = () => call<AuthStatus>("/auth/status");

/**
 * Opens Google's sign-in page in the browser. After the user approves, Google
 * sends them to our server, which saves the tokens and redirects back into the
 * app at `returnTo`. Resolves true if sign-in succeeded.
 */
export async function signIn(): Promise<boolean> {
  const returnTo = Linking.createURL("auth"); // exp://<your-ip>:8081/--/auth in Expo Go
  const deviceId = await getDeviceId();
  const { url } = await call<{ url: string }>(
    `/auth/google/start?deviceId=${deviceId}&returnTo=${encodeURIComponent(returnTo)}`,
  );
  const result = await WebBrowser.openAuthSessionAsync(url, returnTo);
  if (result.type !== "success") return false;
  return Linking.parse(result.url).queryParams?.status === "ok";
}

export const signOut = () => call("/auth/signout", { method: "POST" });

/** Calendar API events.insert, done by the server with this phone's Google tokens. */
export function createCalendarEvent(event: CalendarEvent) {
  return call<{ id: string; htmlLink: string }>("/calendar/events", {
    method: "POST",
    body: JSON.stringify({ event }),
  });
}
