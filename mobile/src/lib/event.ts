import type { CalendarEvent } from "./types";

/** Flat, editable version of a CalendarEvent for the review form. */
export interface EventForm {
  summary: string;
  location: string;
  description: string;
  allDay: boolean;
  /** RFC 3339 for timed events, YYYY-MM-DD for all-day */
  start: string;
  end: string;
  timeZone: string;
}

export function toForm(e: CalendarEvent, fallbackTz: string): EventForm {
  return {
    summary: e.summary,
    location: e.location ?? "",
    description: e.description ?? "",
    allDay: !e.start.dateTime,
    start: e.start.dateTime ?? e.start.date ?? "",
    end: e.end.dateTime ?? e.end.date ?? "",
    timeZone: e.start.timeZone ?? fallbackTz,
  };
}

export function fromForm(f: EventForm): CalendarEvent {
  const when = (v: string) =>
    f.allDay ? { date: v.slice(0, 10) } : { dateTime: v, timeZone: f.timeZone };
  return {
    summary: f.summary,
    ...(f.location ? { location: f.location } : {}),
    ...(f.description ? { description: f.description } : {}),
    start: when(f.start),
    end: when(f.end),
  };
}
