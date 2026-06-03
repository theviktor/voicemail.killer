import { WebSocketServer } from "ws";
import { prisma } from "../prismaClient.js";
import { AgentSession } from "../agent/agentSession.js";
import { buildSessionUpdate } from "../agent/buildSession.js";
import { startRecording } from "./recording.js";

/**
 * Attach the Twilio Media Streams bridge to the HTTP server at /twilio/media.
 *
 * Twilio sends JSON text frames: connected → start → media… → stop.
 *  - inbound caller audio arrives base64 μ-law in media.payload
 *  - to play agent audio back: { event:"media", streamSid, media:{ payload } }
 *  - to flush queued playback on barge-in: { event:"clear", streamSid }
 */
export function attachMediaBridge(server) {
  const wss = new WebSocketServer({ server, path: "/twilio/media" });

  wss.on("connection", (twilioWs) => {
    /** @type {AgentSession|null} */
    let agent = null;
    let streamSid = null;
    let callSid = null;
    let callRecordId = null;
    const transcript = [];
    let finalized = false;

    const sendToTwilio = (obj) => {
      if (twilioWs.readyState === twilioWs.OPEN) twilioWs.send(JSON.stringify(obj));
    };

    async function finalize(status = "COMPLETED") {
      if (finalized) return;
      finalized = true;
      try {
        agent?.close();
      } catch {}
      if (callRecordId) {
        await prisma.callRecord
          .update({
            where: { id: callRecordId },
            data: {
              status,
              endedAt: new Date(),
              streamSid,
              transcript: transcript.length ? transcript : undefined,
            },
          })
          .catch((e) => console.error("[bridge] finalize failed:", e.message));
      }
    }

    twilioWs.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.event) {
        case "start": {
          streamSid = msg.start?.streamSid || msg.streamSid;
          callSid = msg.start?.callSid;
          const params = msg.start?.customParameters || {};
          callRecordId = params.callRecordId;

          const ctx = await loadCallContext(callRecordId);
          if (!ctx) {
            console.error("[bridge] no call context for", callRecordId);
            sendToTwilio({ event: "clear", streamSid });
            twilioWs.close();
            return;
          }

          const sessionUpdate = buildSessionUpdate(ctx);

          agent = new AgentSession({
            sessionUpdate,
            toolContext: {
              callRecordId: ctx.call.id,
              user: ctx.user,
              callerNumber: ctx.call.callerNumber,
              outboundMessageIds: (ctx.outboundMessages || []).map((m) => m.id),
            },
            onAgentAudio: (b64) => {
              // μ-law base64 straight back to Twilio — no transcoding.
              sendToTwilio({ event: "media", streamSid, media: { payload: b64 } });
            },
            onInterrupted: () => {
              // Caller barged in — drop anything Twilio still has buffered.
              sendToTwilio({ event: "clear", streamSid });
            },
            onTranscript: (role, text) => {
              transcript.push({ role, text, ts: new Date().toISOString() });
            },
            onReady: () => console.log(`[bridge] agent ready for call ${callSid}`),
          });
          agent.connect();

          // Kick off Twilio's native recording on the live call.
          startRecording(callSid);
          break;
        }

        case "media": {
          // Forward caller audio to the agent (base64 μ-law passthrough).
          if (agent && msg.media?.payload) agent.sendAudio(msg.media.payload);
          break;
        }

        case "stop":
          await finalize("COMPLETED");
          twilioWs.close();
          break;

        default:
          // "connected", "mark", etc.
          break;
      }
    });

    twilioWs.on("close", () => finalize("COMPLETED"));
    twilioWs.on("error", (e) => {
      console.error("[bridge] twilio ws error:", e.message);
      finalize("FAILED");
    });
  });

  console.log("[bridge] Twilio media bridge attached at /twilio/media");
}

async function loadCallContext(callRecordId) {
  if (!callRecordId) return null;
  const call = await prisma.callRecord.findUnique({ where: { id: callRecordId } });
  if (!call) return null;
  const user = await prisma.user.findUnique({ where: { id: call.userId } });
  if (!user) return null;
  const contact = call.contactId
    ? await prisma.contact.findUnique({
        where: { id: call.contactId },
        include: { group: true },
      })
    : null;

  // Pending messages the user left for this caller, to deliver on this call.
  const outboundMessages = contact
    ? await prisma.outboundMessage.findMany({
        where: { contactId: contact.id, status: "PENDING" },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return {
    call,
    user,
    contact,
    group: contact?.group ?? null,
    classification: call.classification,
    outboundMessages,
  };
}
