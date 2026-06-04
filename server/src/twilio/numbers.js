import { twilioClient } from "./twilioClient.js";
import { env } from "../env.js";
import { normalizePhone } from "../routing/resolveCaller.js";

/** List the account's incoming phone numbers (for the admin picker). */
export async function listAccountNumbers() {
  try {
    const nums = await twilioClient().incomingPhoneNumbers.list({ limit: 100 });
    return nums.map((n) => ({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      voiceUrl: n.voiceUrl,
      voiceConfigured: (n.voiceUrl || "").includes("/twilio/voice"),
    }));
  } catch (e) {
    console.error("[numbers] list failed:", e.message);
    return [];
  }
}

/**
 * Point a number's voice webhook at this server's /twilio/voice.
 * Returns { ok, error? }.
 */
export async function configureNumberWebhook(phoneNumber) {
  const number = normalizePhone(phoneNumber);
  if (!number) return { ok: false, error: "no number" };
  if (!env.publicServerUrl) return { ok: false, error: "PUBLIC_SERVER_URL not set" };
  try {
    const matches = await twilioClient().incomingPhoneNumbers.list({ phoneNumber: number, limit: 5 });
    if (!matches.length) return { ok: false, error: "number not on this Twilio account" };
    await twilioClient()
      .incomingPhoneNumbers(matches[0].sid)
      .update({ voiceUrl: `${env.publicServerUrl}/twilio/voice`, voiceMethod: "POST" });
    return { ok: true };
  } catch (e) {
    console.error("[numbers] configure failed:", e.message);
    return { ok: false, error: e.message };
  }
}
