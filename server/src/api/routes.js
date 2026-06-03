import { Router } from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "../prismaClient.js";
import { normalizePhone } from "../routing/resolveCaller.js";
import { env } from "../env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carriers = JSON.parse(readFileSync(join(__dirname, "../data/carriers.json"), "utf8"));

export const api = Router();

// --- Carriers reference (static) -------------------------------------------
api.get("/carriers", (_req, res) => res.json(carriers));

// --- Users / settings -------------------------------------------------------
// For the demo we expose the first user as the "current" user.
api.get("/me", async (_req, res) => {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  res.json(user);
});

api.get("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json(user);
});

api.put("/users/:id", async (req, res) => {
  const b = req.body || {};
  const data = {};
  for (const f of [
    "name",
    "companyName",
    "voice",
    "availability",
    "systemPromptAddon",
    "alertEmail",
    "alertPhone",
    "telemarketerPolicy",
  ]) {
    if (b[f] !== undefined) data[f] = b[f];
  }
  if (Array.isArray(b.telemarketerTopics)) data.telemarketerTopics = b.telemarketerTopics;
  if (b.twilioNumber) data.twilioNumber = normalizePhone(b.twilioNumber);

  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json(user);
});

// --- Contacts ---------------------------------------------------------------
api.get("/users/:id/contacts", async (req, res) => {
  const contacts = await prisma.contact.findMany({
    where: { userId: req.params.id },
    include: { group: true },
    orderBy: { name: "asc" },
  });
  res.json(contacts);
});

api.post("/users/:id/contacts", async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone) return res.status(400).json({ error: "name and phone required" });
  const contact = await prisma.contact.create({
    data: {
      userId: req.params.id,
      name: b.name,
      phone: normalizePhone(b.phone),
      groupId: b.groupId || null,
      notes: b.notes || null,
    },
  });
  res.status(201).json(contact);
});

api.delete("/contacts/:id", async (req, res) => {
  await prisma.contact.delete({ where: { id: req.params.id } }).catch(() => {});
  res.sendStatus(204);
});

// --- Groups -----------------------------------------------------------------
api.get("/users/:id/groups", async (req, res) => {
  const groups = await prisma.group.findMany({
    where: { userId: req.params.id },
    orderBy: { name: "asc" },
  });
  res.json(groups);
});

api.post("/users/:id/groups", async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "name required" });
  const group = await prisma.group.create({
    data: {
      userId: req.params.id,
      name: b.name,
      greeting: b.greeting || null,
      systemPromptAddon: b.systemPromptAddon || null,
      allowedTopics: Array.isArray(b.allowedTopics) ? b.allowedTopics : [],
    },
  });
  res.status(201).json(group);
});

api.put("/groups/:id", async (req, res) => {
  const b = req.body || {};
  const data = {};
  if (b.name !== undefined) data.name = b.name;
  if (b.greeting !== undefined) data.greeting = b.greeting || null;
  if (b.systemPromptAddon !== undefined) data.systemPromptAddon = b.systemPromptAddon || null;
  if (Array.isArray(b.allowedTopics))
    data.allowedTopics = b.allowedTopics.map((s) => s.trim()).filter(Boolean);
  const group = await prisma.group.update({ where: { id: req.params.id }, data });
  res.json(group);
});

api.delete("/groups/:id", async (req, res) => {
  await prisma.group.delete({ where: { id: req.params.id } }).catch(() => {});
  res.sendStatus(204);
});

// --- Outbound messages (left FOR a caller, delivered when they call) --------
api.get("/users/:id/outbound", async (req, res) => {
  const msgs = await prisma.outboundMessage.findMany({
    where: { userId: req.params.id },
    include: { contact: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  res.json(msgs);
});

api.post("/users/:id/outbound", async (req, res) => {
  const b = req.body || {};
  if (!b.contactId || !b.body) return res.status(400).json({ error: "contactId and body required" });
  // Ensure the contact belongs to this user.
  const contact = await prisma.contact.findFirst({
    where: { id: b.contactId, userId: req.params.id },
  });
  if (!contact) return res.status(404).json({ error: "contact not found" });
  const msg = await prisma.outboundMessage.create({
    data: { userId: req.params.id, contactId: b.contactId, body: b.body },
    include: { contact: true },
  });
  res.status(201).json(msg);
});

api.delete("/outbound/:id", async (req, res) => {
  // Soft-cancel so it won't be delivered.
  await prisma.outboundMessage
    .update({ where: { id: req.params.id }, data: { status: "CANCELED" } })
    .catch(() => {});
  res.sendStatus(204);
});

// --- Call records -----------------------------------------------------------
api.get("/users/:id/calls", async (req, res) => {
  const calls = await prisma.callRecord.findMany({
    where: { userId: req.params.id },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { contact: true },
  });
  res.json(calls);
});

api.get("/calls/:id", async (req, res) => {
  const call = await prisma.callRecord.findUnique({
    where: { id: req.params.id },
    include: { contact: true },
  });
  if (!call) return res.status(404).json({ error: "not found" });
  res.json(call);
});

// Stream the Twilio recording through the server so the browser never sees
// Twilio credentials. Twilio recording media requires Basic auth.
api.get("/calls/:id/recording", async (req, res) => {
  const call = await prisma.callRecord.findUnique({ where: { id: req.params.id } });
  if (!call?.recordingUrl) return res.status(404).json({ error: "no recording" });

  const auth = Buffer.from(
    `${env.twilio.accountSid}:${env.twilio.authToken}`
  ).toString("base64");
  const upstream = await fetch(`${call.recordingUrl}.mp3`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!upstream.ok) return res.status(502).json({ error: "fetch failed" });

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", `inline; filename="call-${call.id}.mp3"`);
  // Stream the body through.
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
});

export default api;
