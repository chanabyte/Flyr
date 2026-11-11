import Constants from "expo-constants";
import type { FlyerEvent } from "./types";

/**
 * Where the Flyr server lives. Set EXPO_PUBLIC_API_URL in mobile/.env to override.
 * In development we default to the same computer that runs `expo start`
 * (its LAN IP comes from hostUri), so a phone on the same Wi-Fi just works.
 */
function apiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:3000`;
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function extractEvent(imageBase64: string, mimeType: string): Promise<FlyerEvent> {
  const res = await fetch(`${apiUrl()}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      today: todayLocal(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data.event as FlyerEvent;
}
