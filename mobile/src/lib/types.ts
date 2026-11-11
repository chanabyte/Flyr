// Keep in sync with server/src/types.ts.
// CalendarEvent matches the Google Calendar API Event resource, so it can be
// POSTed as-is to https://www.googleapis.com/calendar/v3/calendars/primary/events

export interface EventDateTime {
  /** RFC 3339 with offset, timed events */
  dateTime?: string;
  /** YYYY-MM-DD, all-day events (end.date is the day AFTER the last day) */
  date?: string;
  timeZone?: string;
}

export interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
}

export interface ExtractResponse {
  rawText: string;
  ocrConfidence: number;
  event: CalendarEvent;
}
