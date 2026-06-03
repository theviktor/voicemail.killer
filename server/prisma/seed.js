import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // server/prisma
dotenv.config({ path: join(here, "../../.env") });
dotenv.config();

const prisma = new PrismaClient();

// Demo user profile is env-driven so the e2e setup uses YOUR real Twilio number.
const TWILIO_NUMBER = process.env.DEMO_TWILIO_NUMBER || "+15555550123";
const NAME = process.env.DEMO_USER_NAME || "Alex Rivera";
const COMPANY = process.env.DEMO_COMPANY || "Rivera Consulting";
const ALERT_EMAIL = process.env.DEMO_ALERT_EMAIL || "alex@example.com";
const ALERT_PHONE = process.env.DEMO_ALERT_PHONE || "+15555550199";

async function main() {
  const user = await prisma.user.upsert({
    where: { twilioNumber: TWILIO_NUMBER },
    update: {
      name: NAME,
      companyName: COMPANY,
      alertEmail: ALERT_EMAIL,
      alertPhone: ALERT_PHONE,
    },
    create: {
      name: NAME,
      companyName: COMPANY,
      twilioNumber: TWILIO_NUMBER,
      voice: "james",
      availability: "in meetings and unable to take calls until this afternoon",
      alertEmail: ALERT_EMAIL,
      alertPhone: ALERT_PHONE,
      telemarketerTopics: ["enterprise software discounts"],
      telemarketerPolicy:
        "Politely decline, ask them to add Alex to their do-not-call list and remove this number, and do not commit to anything.",
      systemPromptAddon:
        "Be friendly and efficient. Never schedule meetings yourself — always take a message for those.",
    },
  });

  const family = await prisma.group.upsert({
    where: { userId_name: { userId: user.id, name: "Family" } },
    update: {},
    create: {
      userId: user.id,
      name: "Family",
      greeting:
        "Hey! You've reached Alex's assistant. Alex is tied up right now — this call may be recorded — what's going on?",
      systemPromptAddon:
        "This is a family member. Be warm and relaxed. You may share that Alex is doing well and will call back soon.",
      allowedTopics: ["whether Alex is okay", "when Alex will be free"],
    },
  });

  await prisma.contact.upsert({
    where: { userId_phone: { userId: user.id, phone: "+15555550150" } },
    update: {},
    create: {
      userId: user.id,
      name: "Jordan Rivera",
      phone: "+15555550150",
      groupId: family.id,
      notes: "Alex's sibling.",
    },
  });

  console.log("Seeded user:", user.id, user.name, user.twilioNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
