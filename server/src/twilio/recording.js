import { twilioClient } from "./twilioClient.js";
import { env } from "../env.js";
import { prisma } from "../prismaClient.js";

/**
 * Start dual-channel recording on an in-progress call. We use Twilio's native
 * recording (cheapest path) rather than capturing audio in the bridge — Twilio
 * hosts the file and gives us a URL via the status callback.
 */
export async function startRecording(callSid) {
  if (!callSid) return;
  try {
    await twilioClient()
      .calls(callSid)
      .recordings.create({
        recordingChannels: "dual",
        recordingTrack: "both",
        recordingStatusCallback: `${env.publicServerUrl}/twilio/recording-status`,
        recordingStatusCallbackEvent: ["completed"],
      });
    console.log(`[recording] started for call ${callSid}`);
  } catch (e) {
    console.error(`[recording] failed to start for ${callSid}:`, e.message);
  }
}

/** Express handler for Twilio's recording status callback. */
export async function recordingStatusHandler(req, res) {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body || {};
  res.sendStatus(204); // ack fast

  if (!CallSid || !RecordingUrl) return;
  try {
    await prisma.callRecord.updateMany({
      where: { callSid: CallSid },
      data: {
        // `.mp3` is appended on fetch; store the base resource URL.
        recordingUrl: RecordingUrl,
        recordingDurationSec: RecordingDuration ? Number(RecordingDuration) : null,
      },
    });
    console.log(`[recording] stored url for call ${CallSid}`);
  } catch (e) {
    console.error("[recording] status update failed:", e.message);
  }
}
