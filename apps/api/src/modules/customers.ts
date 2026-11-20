import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { h } from "../http.js";

export const customers = Router();

customers.get("/customers", h(async (req, res) => {
  const { q } = z.object({ q: z.string().optional() }).parse(req.query);
  const where = q
    ? { OR: [{ surname: { contains: q, mode: "insensitive" as const } }, { companyName: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }
    : {};
  res.json(await prisma.customer.findMany({ where, take: 100, include: { vessels: true } }));
}));

const CustomerInput = z.object({
  isCompany: z.boolean().default(false),
  firstName: z.string().optional(),
  surname: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  addressLines: z.array(z.string()).default([]),
  postcode: z.string().optional(),
});

customers.post("/customers", h(async (req, res) => {
  res.status(201).json(await prisma.customer.create({ data: CustomerInput.parse(req.body) }));
}));

const VesselInput = z.object({
  ownerId: z.string(),
  name: z.string().min(1),
  lengthM: z.number().positive(),
  beamM: z.number().positive().optional(),
  draftM: z.number().positive().optional(),
});

customers.post("/vessels", h(async (req, res) => {
  res.status(201).json(await prisma.vessel.create({ data: VesselInput.parse(req.body) }));
}));

/** Compliance documents expiring within `days` (default 30), or already expired. */
customers.get("/vessels/compliance", h(async (req, res) => {
  const { days } = z.object({ days: z.coerce.number().int().default(30) }).parse(req.query);
  const until = new Date(Date.now() + days * 86_400_000);
  res.json(await prisma.complianceDocument.findMany({
    where: { expiresOn: { lte: until } },
    include: { vessel: { include: { owner: true } } },
    orderBy: { expiresOn: "asc" },
  }));
}));
