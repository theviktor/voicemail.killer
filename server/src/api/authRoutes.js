import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { verifyPassword, signToken, authRequired } from "../auth/auth.js";

export const authRoutes = Router();

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

authRoutes.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  const ok = user && (await verifyPassword(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// Current authenticated user.
authRoutes.get("/me", authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth.uid } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json(publicUser(user));
});

export { publicUser };
export default authRoutes;
