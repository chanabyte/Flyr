# Flyr

Snap a photo of a flyer → OCR reads the text → Gemini structures it → the event lands in Google Calendar.

```
mobile/   Expo (React Native) app: camera, review screen, opens Google Calendar
server/   Node/Express API: runs OCR (Tesseract), sends the text to Gemini, returns event JSON
```

## How it works

```
photo ──► cleanup ──► Tesseract OCR ──► raw text ──► Gemini ──► Calendar API event JSON ──► review ──► events.insert
        (preprocess.ts)    (ocr.ts)                  (gemini.ts)                              (mobile)  (google/calendar.ts)
```

1. `mobile/src/app/index.tsx` takes or picks a photo (`expo-image-picker`) and POSTs it as base64 to `POST /extract`.
2. `server/src/preprocess.ts` cleans the photo with **sharp**: fixes rotation, resizes, grayscale,
   inverts light-on-dark flyers, removes shadows/uneven lighting, boosts contrast.
   `server/src/ocr.ts` then runs **Tesseract** on it and gets plain, unstructured text.
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
4. `mobile/src/app/review.tsx` lets you fix anything (native date/time pickers), and shows the raw OCR text.
5. "Add to Google Calendar" signs you in with Google (first time only), then the server calls the
   Calendar API `events.insert` with the event JSON (`server/src/google/`).
   If Google isn't set up on the server yet, it falls back to opening a prefilled Google Calendar link.

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

## Google Calendar setup

Sign-in happens in the phone's browser; the server holds the Google tokens and creates events.
Google only redirects to **HTTPS** addresses, so during development the server needs a tunnel.

**1. Tunnel (gives your laptop a stable HTTPS address)**

```sh
brew install ngrok
ngrok config add-authtoken <token from dashboard.ngrok.com>
# dashboard.ngrok.com > Domains: claim your free static domain, then:
ngrok http --url=<your-domain>.ngrok-free.app 3000
```

**2. Google Cloud Console** (console.cloud.google.com, signed in with the Google account you'll test with)

1. Create a project (e.g. "Flyr").
2. APIs & Services > Library > **Google Calendar API** > Enable.
3. APIs & Services > OAuth consent screen (Google Auth Platform):
   - App name "Flyr", your email as support/developer contact, audience **External**.
   - Data access / Scopes: add `.../auth/calendar.events`.
   - Audience > **Test users**: add your Gmail address. (While the app is in "Testing", only test
     users can sign in, and sign-ins expire after 7 days, so you'll just sign in again.)
4. APIs & Services > Credentials > Create credentials > **OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://<your-domain>.ngrok-free.app/auth/google/callback`
   - Copy the **Client ID** and **Client secret**.

**3. `server/.env`**

```sh
GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
PUBLIC_URL=https://<your-domain>.ngrok-free.app
```

Restart `npm run dev`. It prints the redirect URI it uses, which must match the one in step 2 exactly.
Saved sign-ins go in `server/data/tokens.json` (gitignored; it contains refresh tokens).

## Project layout

```
mobile/src/
  app/              screens (Expo Router: every file is a route)
    _layout.tsx     navigation stack
    index.tsx       capture screen
    review.tsx      edit + add to calendar
    auth.tsx        landing spot for the deep link back from Google sign-in
  components/       Button, DateTimeField (native date/time pickers)
  lib/
    api.ts          calls the server (extract, sign-in, create event)
    device.ts       random per-install ID kept in secure storage
    calendar.ts     prefilled Google Calendar link (fallback)
    event.ts        CalendarEvent <-> editable form
    eventStore.ts   passes the result between screens
    types.ts        CalendarEvent etc. (keep in sync with server/src/types.ts)

server/src/
  index.ts          Express app: GET /health, POST /extract (cleanup -> OCR -> Gemini)
  preprocess.ts     sharp: photo -> OCR-friendly image
  ocr.ts            Tesseract: image -> raw text
  gemini.ts         prompt + schema: raw text -> Calendar API event
  types.ts          CalendarEvent, ExtractRequest, ExtractResponse
  google/
    routes.ts       /auth/status, /auth/google/start, /auth/google/callback, /auth/signout, /calendar/events
    auth.ts         OAuth sign-in flow, token refresh
    calendar.ts     Calendar API events.insert
    tokenStore.ts   saved sign-ins (server/data/tokens.json)
```

## Checks

```sh
cd mobile && npm run typecheck
cd server && npm run typecheck
```

## Ideas for later

- Host the server (Render / Railway / Fly.io) so it works away from your Wi-Fi, and drop the tunnel
- Pick which calendar to add to (not just the primary one)
- Multiple events per flyer, history of scanned flyers
