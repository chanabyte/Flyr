import express from "express";
import cors from "cors";
import { readText } from "./ocr.js";
import { structureEvent } from "./gemini.js";
import type { ExtractRequest, ExtractResponse } from "./types.js";

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-key-here") {
  console.error("Set GEMINI_API_KEY in server/.env (see .env.example)");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" })); // photos arrive as base64

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/** Photo -> OCR text -> Gemini -> Google Calendar event JSON */
app.post("/extract", async (req, res) => {
  const body = req.body as Partial<ExtractRequest>;
  if (!body.imageBase64 || !body.today || !body.timeZone) {
    res.status(400).json({ error: "imageBase64, today and timeZone are required" });
    return;
  }

  try {
    const ocr = await readText(Buffer.from(body.imageBase64, "base64"));
    console.log(`OCR (${Math.round(ocr.confidence)}% confidence):\n${ocr.text}\n`);
    if (ocr.text.length < 5) {
      res.status(422).json({ error: "No readable text found. Try a closer, well-lit photo." });
      return;
    }

    const event = await structureEvent(ocr.text, body.today, body.timeZone);
    const response: ExtractResponse = { rawText: ocr.text, ocrConfidence: ocr.confidence, event };
    res.json(response);
  } catch (err) {
    const status = (err as { status?: number }).status;
    console.error(`Extract failed (${status ?? "no status"}):`, (err as Error).message);
    if (status === 429) {
      res.status(429).json({ error: "Gemini usage limit reached. Try again later." });
    } else if (status === 503) {
      res.status(503).json({ error: "Gemini is busy right now. Try again in a minute." });
    } else {
      res.status(502).json({ error: "Could not read an event from that image" });
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 so a phone on the same Wi-Fi can reach it
app.listen(port, "0.0.0.0", () => {
  console.log(`Flyr server listening on http://0.0.0.0:${port}`);
});
