import { GoogleGenAI } from "@google/genai";
import type { CalendarEvent, EventDateTime } from "./types.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

const dateTimeSchema = {
  type: "object",
  properties: {
    dateTime: { type: "string", description: "RFC 3339 with offset, timed events only, else empty" },
    date: { type: "string", description: "YYYY-MM-DD, all-day events only, else empty" },
    timeZone: { type: "string", description: "IANA timezone" },
  },
  required: ["dateTime", "date", "timeZone"],
};

const eventSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    location: { type: "string" },
    description: { type: "string" },
    start: dateTimeSchema,
    end: dateTimeSchema,
  },
  required: ["summary", "location", "description", "start", "end"],
};

/** Step 2: unstructured OCR text in, Google Calendar event JSON out. */
export async function structureEvent(rawText: string, today: string, timeZone: string): Promise<CalendarEvent> {
  const prompt = `Below is raw OCR text from a photo of a flyer, poster or invitation. OCR text is messy:
lines may be out of order, words split, and characters misread (O/0, l/1, S/5). Work out the single main event.

Today is ${today}. The user's timezone is ${timeZone}.
Return a Google Calendar API event:
- summary: the event name.
- Timed events: fill start.dateTime and end.dateTime (RFC 3339 with offset), leave date as "".
- If no end time is given, end = start + 1 hour.
- If no time is given at all, it is all-day: fill start.date and end.date (YYYY-MM-DD; end.date is the day AFTER the last day), leave dateTime as "".
- Resolve relative dates ("this Friday", "tomorrow") against today. If the year is missing, use the next upcoming occurrence.
- timeZone: the user's timezone unless the flyer states another.
- description: short summary of other useful details (price, RSVP link, what to bring), or "".
- location: "" if none.

OCR text:
"""
${rawText}
"""`;

  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [{ type: "text", text: prompt }],
    response_format: { type: "text", mime_type: "application/json", schema: eventSchema },
  });

  if (!interaction.output_text) throw new Error("Gemini returned no output");
  return clean(JSON.parse(interaction.output_text));
}

/** Drop the empty strings the schema forces, so the result is a valid Calendar API body. */
function clean(e: CalendarEvent): CalendarEvent {
  const dt = (d: EventDateTime): EventDateTime =>
    d.dateTime ? { dateTime: d.dateTime, timeZone: d.timeZone } : { date: d.date };
  return {
    summary: e.summary,
    ...(e.location ? { location: e.location } : {}),
    ...(e.description ? { description: e.description } : {}),
    start: dt(e.start),
    end: dt(e.end),
  };
}
