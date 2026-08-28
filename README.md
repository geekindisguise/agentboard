# Agentboard

A public ticker of AI-agent incidents.

People come to watch, screenshot, and drop a source URL. Submissions land in Pending. The public board only shows reviewed cards.

## Local

```bash
npm install
ADMIN_PASSWORD=change-me npm run dev
```

- Board: http://localhost:3000
- Admin: http://localhost:3000/admin

`ADMIN_PASSWORD` is required for `/admin`. Do not commit it.

```bash
npm test
npm run build
PORT=3000 ADMIN_PASSWORD=change-me npm start
```

Optional: `DATA_PATH` points the JSON store somewhere other than `data/incidents.json`.

## Railway

This repo is deployable as a Node app (`npm run build`, then `npm start`). Railway should set `PORT`.

Set **`ADMIN_PASSWORD` as a Railway environment variable**. Never put the password in git.

Optional Railway env:

- `DATA_PATH` — JSON store path if you attach a volume (for example `/data/incidents.json`)

## What it does

- `/` — reverse-chronological incident cards (date, who, one sentence, source, status)
- Footer counter: `N incidents · last added {time}`
- URL paste at the bottom: title is fetched, body is not; the card stays Pending
- `/admin` — shared password; publish, reject, or edit the one-liner
- Hard-reject for how-to / exploit / PoC / payload / “how to reproduce” URLs (never shown on `/`)

Seeds load on first run: OpenAI (27 Aug 2026, official writeup) and Hugging Face (16 Jul 2026, reported).
