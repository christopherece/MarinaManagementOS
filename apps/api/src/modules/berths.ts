import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { h } from "../http.js";

export const berths = Router();

berths.get("/marinas", h(async (_req, res) => {
  res.json(await prisma.marina.findMany({ include: { piers: true } }));
}));

berths.get("/berths", h(async (req, res) => {
  const q = z.object({ marinaId: z.string().optional(), status: z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED"]).optional() }).parse(req.query);
  res.json(await prisma.berth.findMany({ where: q, include: { type: true, pier: true }, orderBy: { name: "asc" } }));
}));

const BerthInput = z.object({
  marinaId: z.string(),
  pierId: z.string().optional(),
  typeId: z.string(),
  name: z.string().min(1),
  nominalLengthM: z.number().positive(),
  nominalWidthM: z.number().positive().optional(),
  nominalDepthM: z.number().positive().optional(),
});

berths.post("/berths", h(async (req, res) => {
  res.status(201).json(await prisma.berth.create({ data: BerthInput.parse(req.body) }));
}));
