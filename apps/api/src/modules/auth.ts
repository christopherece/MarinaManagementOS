import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { endSession, hashPassword, requireAuth, requireRole, startSession, verifyPassword } from "../auth.js";
import { h, HttpError } from "../http.js";
import { audit } from "../audit.js";

export const auth = Router();

const RoleEnum = z.enum(["ADMIN", "BERTH_OFFICE", "FINANCE", "READ_ONLY"]);
const userSelect = { id: true, email: true, name: true, role: true, active: true } as const;

auth.post("/auth/login", h(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Same answer for an unknown email and a wrong password.
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is wrong");
  }
  await startSession(res, user.id);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}));

auth.post("/auth/logout", h(async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
}));

auth.get("/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

auth.get("/users", requireAuth, requireRole("ADMIN"), h(async (_req, res) => {
  res.json(await prisma.user.findMany({ select: userSelect, orderBy: { name: "asc" } }));
}));

auth.post("/users", requireAuth, requireRole("ADMIN"), h(async (req, res) => {
  const { password, ...rest } = z.object({
    email: z.string().email().transform((s) => s.toLowerCase()),
    name: z.string().min(1),
    role: RoleEnum,
    password: z.string().min(10, "Use at least 10 characters"),
  }).parse(req.body);
  const user = await prisma.user.create({ data: { ...rest, passwordHash: await hashPassword(password) }, select: userSelect });
  await audit(req, "User", user.id, "CREATE", { email: user.email, role: user.role });
  res.status(201).json(user);
}));

auth.patch("/users/:id", requireAuth, requireRole("ADMIN"), h(async (req, res) => {
  const { password, ...rest } = z.object({
    role: RoleEnum.optional(),
    active: z.boolean().optional(),
    password: z.string().min(10).optional(),
  }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: String(req.params.id) },
    data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    select: userSelect,
  });
  // Sign the user out everywhere when they are disabled or their password changes.
  if (rest.active === false || password) await prisma.session.deleteMany({ where: { userId: user.id } });
  await audit(req, "User", user.id, "UPDATE", { ...rest, passwordChanged: Boolean(password) });
  res.json(user);
}));
