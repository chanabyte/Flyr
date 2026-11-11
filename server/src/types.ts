/**
 * Matches the Google Calendar API Event resource (the fields we use), so it can
 * be sent as-is to POST https://www.googleapis.com/calendar/v3/calendars/primary/events
 * Timed events use start.dateTime + timeZone; all-day events use start.date
 * (and end.date is the day AFTER the last day, per Google's rules).
 */
export interface EventDateTime {
  /** RFC 3339 with offset, e.g. 2026-11-14T19:00:00-06:00 */
  dateTime?: string;
  /** YYYY-MM-DD, all-day events only */
  date?: string;
  /** IANA timezone, e.g. America/Chicago */
  timeZone?: string;
}

export interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
}

export interface ExtractRequest {
  imageBase64: string;
  /** Today's date on the device, YYYY-MM-DD. Used to resolve "this Friday" etc. */
  today: string;
  /** IANA timezone on the device. */
  timeZone: string;
}

export interface ExtractResponse {
  /** What OCR read off the image, useful for debugging. */
  rawText: string;
  /** Tesseract's 0-100 confidence. */
  ocrConfidence: number;
  event: CalendarEvent;
}
