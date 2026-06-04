import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { authRequired, adminRequired, hashPassword } from "../auth/auth.js";
import { publicUser } from "./authRoutes.js";
import { normalizePhone } from "../routing/resolveCaller.js";
import { listAccountNumbers, configureNumberWebhook } from "../twilio/numbers.js";

export const adminRoutes = Router();
adminRoutes.use(authRequired, adminRequired);

// List all users with light counts.
adminRoutes.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { contacts: true, calls: true } } },
  });
  res.json(users.map((u) => ({ ...publicUser(u), counts: u._count })));
});

// Create a user (with login).
adminRoutes.post("/users", async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.password || !b.name)
    return res.status(400).json({ error: "name, email, and password are required" });

  const email = String(b.email).toLowerCase().trim();
  const twilioNumber = b.twilioNumber ? normalizePhone(b.twilioNumber) : null;

  if (await prisma.user.findUnique({ where: { email } }))
    return res.status(409).json({ error: "A user with that email already exists" });
  if (twilioNumber && (await prisma.user.findUnique({ where: { twilioNumber } })))
    return res.status(409).json({ error: "That Twilio number is already assigned" });

  const user = await prisma.user.create({
    data: {
      name: b.name,
      companyName: b.companyName || null,
      email,
      passwordHash: await hashPassword(b.password),
      role: b.role === "ADMIN" ? "ADMIN" : "USER",
      twilioNumber: twilioNumber || `unassigned-${Date.now()}`,
      alertEmail: b.alertEmail || email,
      alertPhone: b.alertPhone || null,
    },
  });

  let twilio = null;
  if (twilioNumber && b.autoConfigureTwilio !== false) {
    twilio = await configureNumberWebhook(twilioNumber);
  }
  res.status(201).json({ user: publicUser(user), twilio });
});

// Update a user (profile / role / number / optional password reset).
adminRoutes.put("/users/:id", async (req, res) => {
  const b = req.body || {};
  const data = {};
  for (const f of ["name", "companyName", "alertEmail", "alertPhone", "availability"]) {
    if (b[f] !== undefined) data[f] = b[f];
  }
  if (b.role === "ADMIN" || b.role === "USER") data.role = b.role;
  if (b.email) data.email = String(b.email).toLowerCase().trim();
  if (b.password) data.passwordHash = await hashPassword(b.password);

  let twilio = null;
  if (b.twilioNumber !== undefined) {
    const num = b.twilioNumber ? normalizePhone(b.twilioNumber) : null;
    if (num) {
      const clash = await prisma.user.findFirst({
        where: { twilioNumber: num, NOT: { id: req.params.id } },
      });
      if (clash) return res.status(409).json({ error: "That Twilio number is already assigned" });
      data.twilioNumber = num;
      if (b.autoConfigureTwilio !== false) twilio = await configureNumberWebhook(num);
    }
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ user: publicUser(user), twilio });
});

// Delete a user (cascades their data). Can't delete yourself.
adminRoutes.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.auth.uid)
    return res.status(400).json({ error: "You can't delete your own account" });
  await prisma.user.delete({ where: { id: req.params.id } }).catch(() => {});
  res.sendStatus(204);
});

// Re-point a user's Twilio number webhook on demand.
adminRoutes.post("/users/:id/configure-twilio", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "not found" });
  const result = await configureNumberWebhook(user.twilioNumber);
  res.json(result);
});

// Available Twilio numbers on the account (for the picker).
adminRoutes.get("/twilio-numbers", async (_req, res) => {
  res.json(await listAccountNumbers());
});

export default adminRoutes;
