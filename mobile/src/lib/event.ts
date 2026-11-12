import type { CalendarEvent } from "./types";

/** Editable version of a CalendarEvent for the review form. */
export interface EventForm {
  summary: string;
  location: string;
  description: string;
  allDay: boolean;
  start: Date;
  /**
   * Timed: when it ends. All-day: the LAST day of the event (inclusive).
   * Google's API wants the day after the last day; fromForm handles that.
   */
  end: Date;
  timeZone: string;
}

const HOUR_MS = 60 * 60 * 1000;
const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");

/** "2026-11-20" -> local midnight on that day (not UTC midnight, which can be the day before) */
function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local Date -> "2026-11-20" */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local Date -> "2026-11-14T19:00:00-06:00" (RFC 3339 with this device's offset) */
function formatDateTime(d: Date): string {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const tz = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${formatDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${tz}`;
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function toForm(e: CalendarEvent, fallbackTz: string): EventForm {
  const allDay = !e.start.dateTime;
  let start: Date, end: Date;
  if (allDay) {
    start = parseDate(e.start.date!);
    // Google's end.date is exclusive, so show the day before it
    end = e.end.date ? addDays(parseDate(e.end.date), -1) : start;
    if (end < start) end = start;
  } else {
    start = new Date(e.start.dateTime!);
    end = e.end.dateTime ? new Date(e.end.dateTime) : new Date(start.getTime() + HOUR_MS);
  }
  return {
    summary: e.summary,
    location: e.location ?? "",
    description: e.description ?? "",
    allDay,
    start,
    end,
    timeZone: e.start.timeZone ?? fallbackTz,
  };
}

export function fromForm(f: EventForm): CalendarEvent {
  const base = {
    summary: f.summary.trim() || "Untitled event",
    ...(f.location.trim() ? { location: f.location.trim() } : {}),
    ...(f.description.trim() ? { description: f.description.trim() } : {}),
  };
  if (f.allDay) {
    return { ...base, start: { date: formatDate(f.start) }, end: { date: formatDate(addDays(f.end, 1)) } };
  }
  return {
    ...base,
    start: { dateTime: formatDateTime(f.start), timeZone: f.timeZone },
    end: { dateTime: formatDateTime(f.end), timeZone: f.timeZone },
  };
}

/** Moving the start keeps the event's length, so the end never ends up before the start. */
export function moveStart(f: EventForm, newStart: Date): EventForm {
  const length = Math.max(0, f.end.getTime() - f.start.getTime());
  return { ...f, start: newStart, end: new Date(newStart.getTime() + length) };
}

/** Ending before the start isn't allowed; snap to a sensible minimum instead. */
export function setEnd(f: EventForm, newEnd: Date): EventForm {
  if (newEnd >= f.start) return { ...f, end: newEnd };
  return { ...f, end: f.allDay ? f.start : new Date(f.start.getTime() + HOUR_MS) };
}

export function toggleAllDay(f: EventForm, allDay: boolean): EventForm {
  if (allDay === f.allDay) return f;
  if (allDay) {
    const start = addDays(f.start, 0); // strip the time
    const end = addDays(f.end, 0);
    return { ...f, allDay, start, end: end < start ? start : end };
  }
  // Going back to a timed event: default to 9-10 AM on the first day
  const start = new Date(f.start.getFullYear(), f.start.getMonth(), f.start.getDate(), 9);
  return { ...f, allDay, start, end: new Date(start.getTime() + HOUR_MS) };
}
