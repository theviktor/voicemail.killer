import { twilioClient } from "../twilio/twilioClient.js";
import { env } from "../env.js";

export async function sendSms({ to, body }) {
  if (!to) {
    console.warn("[sms] no recipient; skipping");
    return;
  }
  if (!env.twilio.smsFrom) {
    console.warn("[sms] TWILIO_SMS_FROM not set; skipping");
    return;
  }
  const msg = await twilioClient().messages.create({
    from: env.twilio.smsFrom,
    to,
    body,
  });
  console.log(`[sms] sent to ${to}: ${msg.sid}`);
}
