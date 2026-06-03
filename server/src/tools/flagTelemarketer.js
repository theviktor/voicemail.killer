import { prisma } from "../prismaClient.js";

/**
 * The agent calls this when it determines the caller is a telemarketer/robocall.
 * Marks the call so it surfaces separately in the UI. The agent then follows the
 * user's telemarketer policy (decline + ask for removal) via the system prompt.
 *
 * @param {object} args { company?, reason? }
 * @param {object} ctx  { callRecordId }
 */
export async function flagTelemarketer(args, ctx) {
  await prisma.callRecord.update({
    where: { id: ctx.callRecordId },
    data: {
      classification: "TELEMARKETER",
      messageSummary:
        `Telemarketer${args.company ? ` (${args.company})` : ""}` +
        (args.reason ? `: ${args.reason}` : ""),
    },
  });

  return {
    status: "flagged",
    detail:
      "Caller flagged as telemarketer. Decline politely, request removal from their list, and end the call.",
  };
}
