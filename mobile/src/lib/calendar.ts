import type { CalendarEvent } from "./types";

/** 2026-11-14T19:00:00-06:00 -> 20261115T010000Z */
function toUtcStamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${iso}`);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 2026-11-14 -> 20261114 */
const toDateStamp = (date: string) => date.replace(/-/g, "");

/**
 * Builds a Google Calendar "add event" link from a Calendar API event. Opening it
 * shows the prefilled event and the user taps Save. No Google sign-in needed.
 * Later, the same CalendarEvent object can be POSTed to the Calendar API instead.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = event;
  const dates =
    start.date && end.date
      ? `${toDateStamp(start.date)}/${toDateStamp(end.date)}`
      : `${toUtcStamp(start.dateTime!)}/${toUtcStamp(end.dateTime!)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.summary,
    dates,
    details: event.description ?? "",
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
