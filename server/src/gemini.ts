import { GoogleGenAI } from "@google/genai";
import type { ExtractRequest, FlyerEvent } from "./types.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

const eventSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    start: { type: "string", description: "ISO 8601 datetime with timezone offset" },
    end: { type: "string", description: "ISO 8601 datetime with timezone offset" },
    allDay: { type: "boolean" },
    location: { type: "string" },
    description: { type: "string" },
  },
  required: ["title", "start", "end", "allDay", "location", "description"],
};

export async function extractEvent(req: ExtractRequest): Promise<FlyerEvent> {
  const prompt = `You read photos of flyers, posters and invitations and extract the calendar event.
Today is ${req.today}. The user's timezone is ${req.timeZone}.
Rules:
- Resolve relative dates ("this Friday", "tomorrow") against today. If the year is missing, pick the next upcoming occurrence.
- Use the user's timezone offset for start and end unless the flyer states another timezone.
- If no end time is given, set end to 1 hour after start.
- If no time is given at all, set allDay to true and use T00:00:00 for start and the next day for end.
- description: a short summary of other useful details (price, RSVP link, what to bring). Empty string if none.
- location: empty string if none.`;

  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [
      { type: "text", text: prompt },
      { type: "image", data: req.imageBase64, mime_type: req.mimeType },
    ],
    response_format: { type: "text", mime_type: "application/json", schema: eventSchema },
  });

  if (!interaction.output_text) throw new Error("Gemini returned no output");
  return JSON.parse(interaction.output_text) as FlyerEvent;
}
