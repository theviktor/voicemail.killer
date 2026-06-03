import { prisma } from "../prismaClient.js";
import { sendMessageAlert } from "../alerts/index.js";

/**
 * The agent calls this once it has gathered a message for the user.
 * Persists the message and fires an email + SMS alert.
 *
 * @param {object} args  { caller_name?, summary, message, callback_number?, urgency? }
 * @param {object} ctx   { callRecordId, user }
 */
export async function takeMessage(args, ctx) {
  const urgency = String(args.urgency || "normal").toUpperCase();
  const validUrgency = ["LOW", "NORMAL", "HIGH"].includes(urgency) ? urgency : "NORMAL";

  const call = await prisma.callRecord.update({
    where: { id: ctx.callRecordId },
    data: {
      callerName: args.caller_name || undefined,
      messageSummary: args.summary || null,
      message: args.message || null,
      // Fall back to the caller ID when the caller didn't give a different number.
      callbackNumber: args.callback_number || ctx.callerNumber || null,
      urgency: validUrgency,
      alertedAt: new Date(),
    },
  });

  // Fire the alert but don't block the agent's turn on delivery.
  sendMessageAlert(ctx.user, call).catch((e) =>
    console.error("[takeMessage] alert failed:", e.message)
  );

  return {
    status: "saved",
    detail: `Message saved and ${ctx.user.name} has been notified.`,
  };
}
