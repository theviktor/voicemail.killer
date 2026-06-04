import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load the repo-root .env (works whether the process is started from server/ or
// the repo root). In Docker, vars come from the compose `environment:` block and
// this file may be absent — dotenv just no-ops, and it never overrides vars that
// are already set in the environment.
const here = dirname(fileURLToPath(import.meta.url)); // server/src
dotenv.config({ path: join(here, "../../.env") }); // repo-root .env
dotenv.config(); // fallback: .env in the current working directory

function req(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    console.warn(`[env] ${name} is not set`);
  }
  return v;
}

export const env = {
  port: Number(process.env.SERVER_PORT || 8080),
  nodeEnv: process.env.NODE_ENV || "development",

  assemblyAiKey: req("ASSEMBLYAI_API_KEY"),
  // US region host for the Voice Agent API.
  agentWsUrl: process.env.AGENT_WS_URL || "wss://agents.assemblyai.com/v1/ws",

  twilio: {
    accountSid: req("TWILIO_ACCOUNT_SID"),
    authToken: req("TWILIO_AUTH_TOKEN"),
    smsFrom: req("TWILIO_SMS_FROM"),
  },

  // Public https URL of THIS server (tunnel in dev). Used to build the wss
  // <Stream> URL and Twilio status callbacks.
  publicServerUrl: (process.env.PUBLIC_SERVER_URL || "").replace(/\/$/, ""),

  smtp: {
    host: process.env.SMTP_HOST || "in-v3.mailjet.com",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.ALERT_FROM_EMAIL,
    fromName: process.env.ALERT_FROM_NAME || "AI Receptionist",
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || "dev-insecure-change-me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Seeded admin + demo-user login (create-only; changing later won't reset).
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "ChangeMe-admin-123",
    name: process.env.ADMIN_NAME || "Administrator",
  },
  demoLoginPassword: process.env.DEMO_PASSWORD || "ChangeMe-demo-123",
};

/** Derive the wss://.../twilio/media URL Twilio should stream to. */
export function mediaStreamUrl() {
  const base = env.publicServerUrl.replace(/^http/, "ws");
  return `${base}/twilio/media`;
}
