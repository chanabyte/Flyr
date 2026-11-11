# Flyr

Snap a photo of a flyer → Gemini reads it → the event lands in Google Calendar.

```
mobile/   Expo (React Native) app: camera, review screen, opens Google Calendar
server/   Node/Express API: holds the Gemini key, turns a photo into event JSON
```

## How it works

1. `mobile/src/app/index.tsx` takes or picks a photo (`expo-image-picker`) and POSTs it as base64 to the server.
2. `server/src/gemini.ts` sends the image to Gemini with a JSON schema and gets back
   `{ title, start, end, allDay, location, description }`.
3. `mobile/src/app/review.tsx` lets you fix anything Gemini got wrong.
4. "Add to Google Calendar" opens a prefilled Google Calendar link (`mobile/src/lib/calendar.ts`). Tap Save.

## Setup

**Server**

```sh
cd server
npm install
cp .env.example .env      # then paste your key from https://aistudio.google.com/apikey
npm run dev               # http://0.0.0.0:3000
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
    eventStore.ts   passes the event between screens
    types.ts        FlyerEvent (keep in sync with server/src/types.ts)

server/src/
  index.ts          Express routes: GET /health, POST /extract
  gemini.ts         prompt + schema + Gemini call
  types.ts          FlyerEvent, ExtractRequest
```

## Checks

```sh
cd mobile && npm run typecheck
cd server && npm run typecheck
```

## Ideas for later

- Native date/time pickers on the review screen instead of ISO text fields
- Google sign-in + Calendar API to save the event without leaving the app
- Multiple events per flyer, history of scanned flyers
