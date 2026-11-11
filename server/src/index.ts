import express from "express";
import cors from "cors";
import { extractEvent } from "./gemini.js";
import type { ExtractRequest } from "./types.js";

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

app.post("/extract", async (req, res) => {
  const body = req.body as Partial<ExtractRequest>;
  if (!body.imageBase64 || !body.mimeType || !body.today || !body.timeZone) {
    res.status(400).json({ error: "imageBase64, mimeType, today and timeZone are required" });
    return;
  }
  try {
    const event = await extractEvent(body as ExtractRequest);
    res.json({ event });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not read an event from that image" });
  }
});

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 so a phone on the same Wi-Fi can reach it
app.listen(port, "0.0.0.0", () => {
  console.log(`Flyr server listening on http://0.0.0.0:${port}`);
});
