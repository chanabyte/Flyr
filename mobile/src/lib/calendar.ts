import type { FlyerEvent } from "./types";

/** 2026-11-14T19:00:00-06:00 -> 20261115T010000Z */
function toUtcStamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${iso}`);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 2026-11-14T00:00:00-06:00 -> 20261114 */
function toDateStamp(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
}

/**
 * Builds a Google Calendar "add event" link. Opening it shows a prefilled
 * event the user saves with one tap. No Google sign-in needed in our app.
 */
export function googleCalendarUrl(event: FlyerEvent): string {
  const dates = event.allDay
    ? `${toDateStamp(event.start)}/${toDateStamp(event.end)}`
    : `${toUtcStamp(event.start)}/${toUtcStamp(event.end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
