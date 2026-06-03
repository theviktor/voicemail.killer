import { prisma } from "../prismaClient.js";

/**
 * The agent calls this after it has read out a message the user left for this
 * caller, so it isn't delivered again on the next call.
 *
 * @param {object} args { message_id }
 * @param {object} ctx  { callRecordId, outboundMessageIds }
 */
export async function markMessageDelivered(args, ctx) {
  const id = args.message_id;
  if (!id) return { error: "message_id is required" };
  // Only allow marking messages that belong to this call's caller.
  if (Array.isArray(ctx.outboundMessageIds) && !ctx.outboundMessageIds.includes(id)) {
    return { error: "That message is not for this caller." };
  }
  await prisma.outboundMessage.update({
    where: { id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      deliveredCallId: ctx.callRecordId || null,
    },
  });
  return { status: "delivered" };
}
