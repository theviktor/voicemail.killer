import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { prisma } from "../prismaClient.js";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { uid: user.id, role: user.role, email: user.email },
    env.auth.jwtSecret,
    { expiresIn: env.auth.jwtExpiresIn }
  );
}

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Require a valid JWT. Sets req.auth = { uid, role, email }. */
export function authRequired(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.auth = jwt.verify(token, env.auth.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Require ADMIN role (use after authRequired). */
export function adminRequired(req, res, next) {
  if (req.auth?.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
  next();
}

/** True if the caller owns the user id or is an admin. */
export function canActOnUser(req, userId) {
  return req.auth?.role === "ADMIN" || req.auth?.uid === userId;
}

/**
 * Ensure the authenticated caller owns the resource (or is admin), by checking
 * the resource's userId. `loader` returns the resource (with userId) or null.
 */
export async function ownsResourceOr404(req, res, loader) {
  const resource = await loader();
  if (!resource) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  if (!canActOnUser(req, resource.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return resource;
}

export { prisma };
