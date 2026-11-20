import { Router } from "express";
import { z } from "zod";
import { clashes } from "@mmos/domain";
import { prisma } from "../db.js";
import { h, HttpError } from "../http.js";

export const agreements = Router();

const AgreementInput = z.object({
  type: z.enum(["LICENCE", "CASUAL", "OWNERSHIP", "SUBLEASE", "PRIVATE_OCCUPANCY"]),
  status: z.enum(["QUOTE", "BOOKED", "RENTED"]).default("QUOTE"),
  berthId: z.string(),
  customerId: z.string(),
  vesselId: z.string().optional(),
  productId: z.string().optional(),
  startOn: z.coerce.date(),
  endOn: z.coerce.date().nullable().default(null),
  ownershipCategory: z.enum(["PANUKU", "PRIVATE"]).optional(),
  parentId: z.string().optional(),
});

/** Types that occupy the water. Ownership sits alongside them and never clashes. */
const OCCUPYING = ["LICENCE", "CASUAL", "SUBLEASE", "PRIVATE_OCCUPANCY"] as const;

agreements.get("/agreements", h(async (req, res) => {
  const q = z.object({ berthId: z.string().optional(), customerId: z.string().optional() }).parse(req.query);
  res.json(await prisma.agreement.findMany({ where: q, include: { berth: true, customer: true, vessel: true }, orderBy: { startOn: "desc" } }));
}));

agreements.post("/agreements", h(async (req, res) => {
  const input = AgreementInput.parse(req.body);
  if (input.endOn && input.endOn < input.startOn) throw new HttpError(400, "End date is before start date");
  if (input.type === "OWNERSHIP" && !input.ownershipCategory) throw new HttpError(400, "Ownership needs a category");

  if ((OCCUPYING as readonly string[]).includes(input.type) && input.status !== "QUOTE") {
    const existing = await prisma.agreement.findMany({
      where: { berthId: input.berthId, type: { in: [...OCCUPYING] }, status: { in: ["BOOKED", "RENTED"] } },
    });
    const candidate = { berthId: input.berthId, status: input.status, start: input.startOn, end: input.endOn };
    if (clashes(existing.map((e) => ({ berthId: e.berthId, status: e.status, start: e.startOn, end: e.endOn })), candidate)) {
      throw new HttpError(409, "Berth is already held for some of those dates");
    }
  }
  // For an ownership the customer is the owner; keep ownerId in step so reports find it.
  const data = input.type === "OWNERSHIP" ? { ...input, ownerId: input.customerId } : input;
  res.status(201).json(await prisma.agreement.create({ data }));
}));

/** Berths free for the whole date range that fit the vessel. */
agreements.get("/availability", h(async (req, res) => {
  const q = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    lengthM: z.coerce.number().positive(),
    marinaId: z.string().optional(),
  }).parse(req.query);
  const free = await prisma.berth.findMany({
    where: {
      status: "ACTIVE",
      marinaId: q.marinaId,
      nominalLengthM: { gte: q.lengthM },
      OR: [{ decommissionedOn: null }, { decommissionedOn: { gt: q.to } }],
      blocks: { none: { startOn: { lte: q.to }, endOn: { gte: q.from } } },
      agreements: {
        none: {
          type: { in: [...OCCUPYING] },
          status: { in: ["BOOKED", "RENTED"] },
          startOn: { lte: q.to },
          OR: [{ endOn: null }, { endOn: { gte: q.from } }],
        },
      },
    },
    orderBy: { nominalLengthM: "asc" },
  });
  res.json(free);
}));
