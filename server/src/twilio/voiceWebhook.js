import twilio from "twilio";
import { prisma } from "../prismaClient.js";
import { resolveCaller } from "../routing/resolveCaller.js";
import { mediaStreamUrl } from "../env.js";

const { VoiceResponse } = twilio.twiml;

/**
 * Twilio hits this when a forwarded call lands on the user's Twilio number.
 * We resolve the tenant + caller, create a CallRecord, and return TwiML that
 * connects the call's media to our bridge over a bidirectional Media Stream.
 */
export async function voiceWebhook(req, res) {
  const from = req.body.From || "";
  const to = req.body.To || "";
  const callSid = req.body.CallSid || "";

  const twiml = new VoiceResponse();

  try {
    const { user, contact, classification } = await resolveCaller(to, from);

    if (!user) {
      // No tenant owns this number — fail gracefully.
      twiml.say(
        "Sorry, this number is not configured to receive calls. Goodbye."
      );
      twiml.hangup();
      res.type("text/xml").send(twiml.toString());
      return;
    }

    // Create the call row up front so the bridge + tools have something to write to.
    const call = await prisma.callRecord.upsert({
      where: { callSid },
      create: {
        callSid,
        userId: user.id,
        contactId: contact?.id ?? null,
        callerNumber: from,
        callerName: contact?.name ?? null,
        classification,
        status: "IN_PROGRESS",
      },
      update: {}, // idempotent if Twilio retries the webhook
    });

    // Bidirectional media stream → our bridge. Pass the call id so the bridge
    // can load the full context (prompt/voice/tools) from the DB.
    const connect = twiml.connect();
    const stream = connect.stream({ url: mediaStreamUrl() });
    stream.parameter({ name: "callRecordId", value: call.id });
    stream.parameter({ name: "userId", value: user.id });

    res.type("text/xml").send(twiml.toString());
  } catch (e) {
    console.error("[voiceWebhook] error:", e);
    const fallback = new VoiceResponse();
    fallback.say("Sorry, something went wrong. Please try again later.");
    fallback.hangup();
    res.type("text/xml").send(fallback.toString());
  }
}
