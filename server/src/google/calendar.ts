import { clientFor, NotSignedInError } from "./auth.js";
import { tokenStore } from "./tokenStore.js";
import type { CalendarEvent } from "../types.js";

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface InsertedEvent {
  id: string;
  htmlLink: string;
}

/** Calendar API events.insert: adds the event to the user's main calendar. */
export async function insertEvent(deviceId: string, event: CalendarEvent): Promise<InsertedEvent> {
  const client = clientFor(deviceId);
  try {
    const res = await client.request<InsertedEvent>({ url: EVENTS_URL, method: "POST", data: event });
    return { id: res.data.id, htmlLink: res.data.htmlLink };
  } catch (err) {
    // invalid_grant = the user revoked access or the refresh token expired
    const e = err as { status?: number; message?: string; response?: { status?: number } };
    const status = e.status ?? e.response?.status;
    if (status === 401 || /invalid_grant/.test(e.message ?? "")) {
      tokenStore.delete(deviceId);
      throw new NotSignedInError("Google sign-in expired. Please sign in again.");
    }
    throw err;
  }
}
