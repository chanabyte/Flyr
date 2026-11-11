// Keep in sync with server/src/types.ts
export interface FlyerEvent {
  title: string;
  /** ISO 8601 with timezone offset, e.g. 2026-11-14T19:00:00-06:00 */
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
}
