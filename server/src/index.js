import http from "node:http";
import express from "express";
import cors from "cors";
import { env, mediaStreamUrl } from "./env.js";
import { voiceWebhook } from "./twilio/voiceWebhook.js";
import { recordingStatusHandler } from "./twilio/recording.js";
import { attachMediaBridge } from "./twilio/mediaBridge.js";
import api from "./api/routes.js";

const app = express();
app.use(cors());
app.use(express.json());
// Twilio webhooks post application/x-www-form-urlencoded.
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Twilio telephony webhooks.
app.post("/twilio/voice", voiceWebhook);
app.post("/twilio/recording-status", recordingStatusHandler);

// REST API for the dashboard.
app.use("/api", api);

const server = http.createServer(app);

// Twilio Media Streams WebSocket bridge (path: /twilio/media).
attachMediaBridge(server);

server.listen(env.port, () => {
  console.log(`[server] listening on :${env.port}`);
  console.log(`[server] media stream url: ${mediaStreamUrl()}`);
  if (!env.assemblyAiKey) console.warn("[server] ASSEMBLYAI_API_KEY is not set!");
  if (!env.publicServerUrl) {
    console.warn(
      "[server] PUBLIC_SERVER_URL is not set — Twilio <Stream> and callbacks need a public https URL (use a tunnel in dev)."
    );
  }
});
