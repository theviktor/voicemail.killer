import twilio from "twilio";
import { env } from "../env.js";

let _client = null;

/** Lazily build the Twilio REST client (so the app can boot without creds in dev). */
export function twilioClient() {
  if (_client) return _client;
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    console.warn("[twilio] credentials missing — REST calls will fail");
  }
  _client = twilio(env.twilio.accountSid, env.twilio.authToken);
  return _client;
}
