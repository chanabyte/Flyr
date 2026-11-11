# Flyr

Snap a photo of a flyer → OCR reads the text → Gemini structures it → the event lands in Google Calendar.

```
mobile/   Expo (React Native) app: camera, review screen, opens Google Calendar
server/   Node/Express API: runs OCR (Tesseract), sends the text to Gemini, returns event JSON
```

## How it works

```
photo ──► Tesseract OCR ──► raw text ──► Gemini ──► Google Calendar event JSON ──► review ──► calendar
         (server/src/ocr.ts)          (server/src/gemini.ts)                       (mobile)
```

1. `mobile/src/app/index.tsx` takes or picks a photo (`expo-image-picker`) and POSTs it as base64 to `POST /extract`.
2. `server/src/ocr.ts` runs **Tesseract** on the image and gets plain, unstructured text.
3. `server/src/gemini.ts` sends only that **text** to Gemini (no image), with a JSON schema, and gets back
   a **Google Calendar API Event**:
   ```json
   {
     "summary": "HackUTD Mini",
     "location": "ECSS 2.410",
     "description": "Free pizza, bring a laptop",
     "start": { "dateTime": "2026-11-14T19:00:00-06:00", "timeZone": "America/Chicago" },
     "end":   { "dateTime": "2026-11-14T22:00:00-06:00", "timeZone": "America/Chicago" }
   }
   ```
   All-day events use `start.date` / `end.date` instead. This is exactly the body for
   `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`.
4. `mobile/src/app/review.tsx` lets you fix anything, and shows the raw OCR text for debugging.
5. "Add to Google Calendar" currently opens a prefilled Google Calendar link (`mobile/src/lib/calendar.ts`).

## Setup

**Server**

```sh
cd server
npm install
cp .env.example .env      # then paste your key from https://aistudio.google.com/apikey
npm run dev               # http://0.0.0.0:3000
                          # first request downloads Tesseract's English model (~10 MB)
```

**Mobile** (in a second terminal)

```sh
cd mobile
npm install
npx expo start
```

Install **Expo Go** on your phone and scan the QR code. Your phone and computer must be on the
same Wi-Fi. The app finds the server on your computer automatically. To point it somewhere else,
set `EXPO_PUBLIC_API_URL` in `mobile/.env`.

## Project layout

```
mobile/src/
  app/              screens (Expo Router: every file is a route)
    _layout.tsx     navigation stack
    index.tsx       capture screen
    review.tsx      edit + add to calendar
  components/       reusable UI
  lib/
    api.ts          calls the server
    calendar.ts     builds the Google Calendar link
    event.ts        CalendarEvent <-> editable form
    eventStore.ts   passes the result between screens
    types.ts        CalendarEvent etc. (keep in sync with server/src/types.ts)

server/src/
  index.ts          Express routes: GET /health, POST /extract (OCR -> Gemini)
  ocr.ts            Tesseract: image -> raw text
  gemini.ts         prompt + schema: raw text -> Calendar API event
  types.ts          CalendarEvent, ExtractRequest, ExtractResponse
```

## Checks

```sh
cd mobile && npm run typecheck
cd server && npm run typecheck
```

## Ideas for later

- Native date/time pickers on the review screen instead of ISO text fields
- Google sign-in + Calendar API `events.insert` with the event JSON we already produce
- Multiple events per flyer, history of scanned flyers
