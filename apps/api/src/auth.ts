import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "./db.js";
import { HttpError } from "./http.js";

function scrypt(password: string, salt: Buffer, len: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, len, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const SESSION_COOKIE = "mmos_session";
const SESSION_HOURS = 12;

/** Hash format: scrypt:<salt hex>:<hash hex> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return ["scrypt", salt.toString("hex"), hash.toString("hex")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export async function startSession(res: Response, userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function endSession(req: Request, res: Response) {
  const id = readCookie(req, SESSION_COOKIE);
  if (id) await prisma.session.deleteMany({ where: { id } });
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/** Loads the signed-in user, or answers 401. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const id = readCookie(req, SESSION_COOKIE);
    if (!id) throw new HttpError(401, "Please sign in");
    const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
    if (!session || session.expiresAt < new Date() || !session.user.active) throw new HttpError(401, "Please sign in");
    const { user } = session;
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (e) {
    next(e);
  }
}

/** Reads are open to any signed-in user; changes need one of these roles. ADMIN can always change. */
export function writeRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    const role = req.user?.role;
    if (role === "ADMIN" || (role && roles.includes(role))) return next();
    next(new HttpError(403, "Your role cannot make this change"));
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (role === "ADMIN" || (role && roles.includes(role))) return next();
    next(new HttpError(403, "Not allowed for your role"));
  };
}
