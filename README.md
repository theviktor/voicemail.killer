# AI Receptionist — voicemail replacement powered by AssemblyAI Voice Agent API

When someone's call rolls to voicemail, conditional call-forwarding sends it to a
Twilio number instead, where an **AI receptionist** answers: it recognizes the
caller, follows the user's per-caller rules, answers permitted questions or takes
a message, deters telemarketers, and alerts the user by email + SMS. Every call is
recorded and transcribed and viewable in a dashboard.

Built on the **AssemblyAI Voice Agent API** (managed STT + LLM + TTS + turn
detection + tool calling over one WebSocket). Telephony audio (G.711 μ-law 8 kHz)
passes through end-to-end with **zero resampling** — `input` and `output` encodings
are both `audio/pcmu`.

```
Caller ──(*71 conditional forward)──▶ Twilio number
   Twilio ──POST /twilio/voice──▶ Express  (resolve caller, create CallRecord, return TwiML)
   Twilio ◀──<Connect><Stream> wss──▶ Express /twilio/media  (bridge)
                                          │  μ-law passthrough
                                          ▼
                          AssemblyAI Voice Agent API  (wss://agents.assemblyai.com/v1/ws)
                                          │  tool.call: take_message / flag_telemarketer
                                          ▼
                          Postgres ◀── transcript, recording URL, message
   User ◀── email (Mailjet SMTP) + SMS (Twilio) alert ── Express
   User ──▶ Next.js dashboard (calls, transcript, recording, settings, contacts)
```

## Project layout

```
server/                Express: telephony bridge, agent session, tools, alerts, REST API
  src/twilio/          voice webhook, media bridge, recording, twilio client
  src/agent/           agentSession (WS lifecycle), buildSession (prompt/greeting/payload)
  src/routing/         caller → tenant + contact + classification
  src/tools/           take_message, flag_telemarketer (+ flat-schema registry)
  src/alerts/          Mailjet SMTP email + Twilio SMS
  src/api/             dashboard REST API
  prisma/              schema + seed
web/                   Next.js dashboard (calls, settings, contacts, forwarding setup)
docker-compose.yml     db + server + web
```

## Prerequisites

- Docker + Docker Compose
- A Twilio account with a phone number (and that number on an **A2P 10DLC** campaign if it will send SMS alerts)
- An AssemblyAI API key — https://www.assemblyai.com/dashboard/api-keys
- A Mailjet account (SMTP credentials)
- A public HTTPS tunnel for local dev (ngrok / Cloudflare Tunnel) — Twilio must reach your server

## Setup

```bash
cp .env.example .env
# Fill in ASSEMBLYAI_API_KEY, TWILIO_*, SMTP_* (Mailjet), PUBLIC_SERVER_URL
```

`PUBLIC_SERVER_URL` must be the **public HTTPS URL of the server service**. In dev
that's your tunnel (e.g. `https://abcd.ngrok-free.app`); the code derives the
`wss://…/twilio/media` stream URL and Twilio status callbacks from it.

### Run with Docker (recommended)

```bash
docker compose up --build
# server → http://localhost:8080   web → http://localhost:3000
```

The server container runs `prisma db push` on boot, so the schema is applied
automatically. Seed a demo user (one-time):

```bash
docker compose exec server npm run seed
```

### Run locally without Docker

```bash
# Postgres (or use the compose db)
docker run -d --name pg -e POSTGRES_USER=receptionist -e POSTGRES_PASSWORD=receptionist \
  -e POSTGRES_DB=receptionist -p 5432:5432 postgres:16-alpine

cd server
npm install
export DATABASE_URL="postgresql://receptionist:receptionist@localhost:5432/receptionist?schema=public"
npx prisma db push && npm run seed
npm run dev          # http://localhost:8080

cd ../web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev   # http://localhost:3000

# expose the server for Twilio:
ngrok http 8080      # put the https URL in PUBLIC_SERVER_URL and restart the server
```

## Twilio configuration

1. Buy/assign a number to the user (set `User.twilioNumber` to it, E.164).
2. In the number's **Voice** config, set **A Call Comes In** →
   **Webhook**, `POST`, `https://<PUBLIC_SERVER_URL>/twilio/voice`.
3. Recording is started by the app via the REST API and reported back to
   `/twilio/recording-status` — no extra Twilio console config needed.
4. For SMS alerts, register the `TWILIO_SMS_FROM` number on an A2P 10DLC campaign.

## Call forwarding (the user's phone)

Set **conditional** forwarding (unanswered/busy → Twilio number) so the phone still
rings first. Codes vary by carrier — the dashboard's **Forwarding Setup** page
renders them with the user's number pre-filled. Verizon example: `*71<number>` to
enable, `*73` to disable. (Always verify with the carrier.)

## How customization works

- **Tenant** is resolved from Twilio's `To` (the user's number).
- **Caller** is matched against the user's contacts by `From`:
  - in contacts → `KNOWN` (greeted by name; group `systemPromptAddon`, `greeting`,
    and `allowedTopics` applied)
  - withheld/anonymous id → `TELEMARKETER`
  - otherwise → `UNKNOWN`
- The matched context becomes the agent's `system_prompt` + `greeting` in the first
  `session.update` (both are immutable after `session.ready`, which is fine because
  we already know the caller before the agent connects).
- Tools: `take_message` (persists + fires email/SMS alert) and `flag_telemarketer`.

## Deploying to Easypanel

1. Push this repo to Git.
2. In Easypanel, create a project with three services:
   - **db** → Postgres template (or the compose `db`)
   - **server** → build from `./server`, expose port `8080`, set env from `.env`.
     Set `PUBLIC_SERVER_URL` to the server's public domain and point Twilio at
     `https://<that domain>/twilio/voice`.
   - **web** → build from `./web`, build arg + env `NEXT_PUBLIC_API_URL` = the
     server's public URL, expose port `3000`.
3. Or import `docker-compose.yml` directly. Ensure `DATABASE_URL` points at the
   `db` service and the server's domain is reachable by Twilio.

## Security notes

- The AssemblyAI key, Twilio creds, and SMTP creds live **server-side only** — the
  Next.js client never sees them. Recordings are streamed through the server
  (`/api/calls/:id/recording`) so Twilio credentials stay private.
- The Voice Agent API requires `Authorization: Bearer <key>` (unlike AssemblyAI STT,
  which uses the raw key with no prefix) — handled in `agentSession.js`.
- Call recording is legally sensitive (some US states require all-party consent).
  The greeting discloses recording; adjust for your jurisdiction before production.
