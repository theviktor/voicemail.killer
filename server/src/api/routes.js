import { Router } from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "../prismaClient.js";
import { normalizePhone } from "../routing/resolveCaller.js";
import { env } from "../env.js";
import { authRequired, canActOnUser, ownsResourceOr404 } from "../auth/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carriers = JSON.parse(readFileSync(join(__dirname, "../data/carriers.json"), "utf8"));

export const api = Router();

// Everything in this router requires authentication.
api.use(authRequired);

function ensureSelf(req, res) {
  if (!canActOnUser(req, req.params.id)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// --- Carriers reference -----------------------------------------------------
api.get("/carriers", (_req, res) => res.json(carriers));

// --- Users / settings (self or admin) --------------------------------------
api.get("/users/:id", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "not found" });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

api.put("/users/:id", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  const b = req.body || {};
  const data = {};
  for (const f of [
    "name", "companyName", "voice", "availability",
    "systemPromptAddon", "alertEmail", "alertPhone", "telemarketerPolicy",
  ]) {
    if (b[f] !== undefined) data[f] = b[f];
  }
  if (Array.isArray(b.telemarketerTopics)) data.telemarketerTopics = b.telemarketerTopics;
  // Twilio number changes go through the admin API (uniqueness + webhook wiring).
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// --- Contacts ---------------------------------------------------------------
api.get("/users/:id/contacts", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  res.json(await prisma.contact.findMany({
    where: { userId: req.params.id }, include: { group: true }, orderBy: { name: "asc" },
  }));
});

api.post("/users/:id/contacts", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  const b = req.body || {};
  if (!b.name || !b.phone) return res.status(400).json({ error: "name and phone required" });
  res.status(201).json(await prisma.contact.create({
    data: {
      userId: req.params.id, name: b.name, phone: normalizePhone(b.phone),
      groupId: b.groupId || null, notes: b.notes || null,
    },
  }));
});

api.delete("/contacts/:id", async (req, res) => {
  const c = await ownsResourceOr404(req, res, () =>
    prisma.contact.findUnique({ where: { id: req.params.id } }));
  if (!c) return;
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

// --- Groups -----------------------------------------------------------------
api.get("/users/:id/groups", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  res.json(await prisma.group.findMany({ where: { userId: req.params.id }, orderBy: { name: "asc" } }));
});

api.post("/users/:id/groups", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "name required" });
  res.status(201).json(await prisma.group.create({
    data: {
      userId: req.params.id, name: b.name, greeting: b.greeting || null,
      systemPromptAddon: b.systemPromptAddon || null,
      allowedTopics: Array.isArray(b.allowedTopics) ? b.allowedTopics : [],
    },
  }));
});

api.put("/groups/:id", async (req, res) => {
  const g = await ownsResourceOr404(req, res, () =>
    prisma.group.findUnique({ where: { id: req.params.id } }));
  if (!g) return;
  const b = req.body || {};
  const data = {};
  if (b.name !== undefined) data.name = b.name;
  if (b.greeting !== undefined) data.greeting = b.greeting || null;
  if (b.systemPromptAddon !== undefined) data.systemPromptAddon = b.systemPromptAddon || null;
  if (Array.isArray(b.allowedTopics))
    data.allowedTopics = b.allowedTopics.map((s) => s.trim()).filter(Boolean);
  res.json(await prisma.group.update({ where: { id: req.params.id }, data }));
});

api.delete("/groups/:id", async (req, res) => {
  const g = await ownsResourceOr404(req, res, () =>
    prisma.group.findUnique({ where: { id: req.params.id } }));
  if (!g) return;
  await prisma.group.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

// --- Outbound messages ------------------------------------------------------
api.get("/users/:id/outbound", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  res.json(await prisma.outboundMessage.findMany({
    where: { userId: req.params.id }, include: { contact: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  }));
});

api.post("/users/:id/outbound", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  const b = req.body || {};
  if (!b.contactId || !b.body) return res.status(400).json({ error: "contactId and body required" });
  const contact = await prisma.contact.findFirst({ where: { id: b.contactId, userId: req.params.id } });
  if (!contact) return res.status(404).json({ error: "contact not found" });
  res.status(201).json(await prisma.outboundMessage.create({
    data: { userId: req.params.id, contactId: b.contactId, body: b.body },
    include: { contact: true },
  }));
});

api.delete("/outbound/:id", async (req, res) => {
  const m = await ownsResourceOr404(req, res, () =>
    prisma.outboundMessage.findUnique({ where: { id: req.params.id } }));
  if (!m) return;
  await prisma.outboundMessage.update({ where: { id: req.params.id }, data: { status: "CANCELED" } });
  res.sendStatus(204);
});

// --- Call records -----------------------------------------------------------
api.get("/users/:id/calls", async (req, res) => {
  if (!ensureSelf(req, res)) return;
  res.json(await prisma.callRecord.findMany({
    where: { userId: req.params.id }, orderBy: { startedAt: "desc" }, take: 100, include: { contact: true },
  }));
});

api.get("/calls/:id", async (req, res) => {
  const call = await ownsResourceOr404(req, res, () =>
    prisma.callRecord.findUnique({ where: { id: req.params.id }, include: { contact: true } }));
  if (!call) return;
  res.json(call);
});

// Stream the Twilio recording through the server (keeps Twilio creds private).
api.get("/calls/:id/recording", async (req, res) => {
  const call = await ownsResourceOr404(req, res, () =>
    prisma.callRecord.findUnique({ where: { id: req.params.id } }));
  if (!call) return;
  if (!call.recordingUrl) return res.status(404).json({ error: "no recording" });

  const auth = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString("base64");
  const upstream = await fetch(`${call.recordingUrl}.mp3`, { headers: { Authorization: `Basic ${auth}` } });
  if (!upstream.ok) return res.status(502).json({ error: "fetch failed" });
  res.setHeader("Content-Type", "audio/mpeg");
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
});

export default api;
