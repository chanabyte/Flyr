/** The event shape shared by the server and the mobile app. */
export interface FlyerEvent {
  title: string;
  /** ISO 8601 with timezone offset, e.g. 2026-11-14T19:00:00-06:00 */
  start: string;
  /** ISO 8601 with timezone offset. */
  end: string;
  allDay: boolean;
  location: string;
  description: string;
}

export interface ExtractRequest {
  imageBase64: string;
  mimeType: string;
  /** Today's date on the device, YYYY-MM-DD. Used to resolve "this Friday" etc. */
  today: string;
  /** IANA timezone on the device, e.g. America/Chicago. */
  timeZone: string;
}
