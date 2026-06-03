import { prisma } from "../prismaClient.js";

/** Normalize a phone number to a loose E.164-ish form for matching. */
export function normalizePhone(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  // Keep a leading + then digits only.
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

/**
 * Resolve the tenant (User) from the dialed Twilio number, and match the caller
 * against that user's contacts.
 *
 * @param {string} toNumber   Twilio `To` — the user's assigned Twilio number
 * @param {string} fromNumber Twilio `From` — the caller's id
 * @returns {Promise<{user, contact, group, classification}>}
 */
export async function resolveCaller(toNumber, fromNumber) {
  const to = normalizePhone(toNumber);
  const from = normalizePhone(fromNumber);

  const user = await prisma.user.findUnique({ where: { twilioNumber: to } });
  if (!user) {
    return { user: null, contact: null, group: null, classification: "UNKNOWN" };
  }

  let contact = null;
  if (from) {
    contact = await prisma.contact.findUnique({
      where: { userId_phone: { userId: user.id, phone: from } },
      include: { group: true },
    });
  }

  // Anonymous / withheld caller id is a strong telemarketer/robocall signal.
  const anonymous = !from || /anonymous|private|unavailable|restricted/i.test(fromNumber || "");

  let classification = "UNKNOWN";
  if (contact) classification = "KNOWN";
  else if (anonymous) classification = "TELEMARKETER";

  return {
    user,
    contact,
    group: contact?.group ?? null,
    classification,
  };
}
