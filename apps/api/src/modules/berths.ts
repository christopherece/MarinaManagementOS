import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { writeRoles } from "../auth.js";
import { audit } from "../audit.js";
import { h, HttpError } from "../http.js";

export const berths = Router();
const canWrite = writeRoles("BERTH_OFFICE");

const Status = z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED"]);
const metres = z.number().positive().max(200);

berths.get("/marinas", h(async (_req, res) => {
  res.json(await prisma.marina.findMany({ include: { piers: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }));
}));

berths.get("/berth-types", h(async (_req, res) => {
  res.json(await prisma.berthType.findMany({ orderBy: { name: "asc" } }));
}));

berths.get("/berths", h(async (req, res) => {
  const q = z.object({
    marinaId: z.string().optional(),
    pierId: z.string().optional(),
    typeId: z.string().optional(),
    status: Status.optional(),
    q: z.string().optional(),
  }).parse(req.query);
  res.json(await prisma.berth.findMany({
    where: {
      marinaId: q.marinaId,
      pierId: q.pierId,
      typeId: q.typeId,
      status: q.status,
      name: q.q ? { contains: q.q, mode: "insensitive" } : undefined,
    },
    include: { type: true, pier: true, marina: { select: { id: true, code: true, name: true } } },
    orderBy: [{ marinaId: "asc" }, { name: "asc" }],
  }));
}));

berths.get("/berths/:id", h(async (req, res) => {
  const berth = await prisma.berth.findUnique({
    where: { id: String(req.params.id) },
    include: {
      type: true,
      pier: true,
      marina: true,
      blocks: { orderBy: { startOn: "desc" } },
      agreements: { include: { customer: true, vessel: true }, orderBy: { startOn: "desc" }, take: 20 },
    },
  });
  if (!berth) throw new HttpError(404, "Berth not found");
  res.json(berth);
}));

const BerthInput = z.object({
  marinaId: z.string(),
  pierId: z.string().nullable().optional(),
  typeId: z.string(),
  name: z.string().trim().min(1).max(20),
  nominalLengthM: metres,
  nominalWidthM: metres.nullable().optional(),
  nominalDepthM: metres.nullable().optional(),
  actualLengthM: metres.nullable().optional(),
  actualWidthM: metres.nullable().optional(),
  actualDepthM: metres.nullable().optional(),
  status: Status.default("ACTIVE"),
  decommissionedOn: z.coerce.date().nullable().optional(),
});

function checkStatus(input: { status?: string; decommissionedOn?: Date | null }) {
  if (input.status === "DECOMMISSIONED" && !input.decommissionedOn) {
    throw new HttpError(400, "A decommissioned berth needs a decommissioned date");
  }
}

berths.post("/berths", canWrite, h(async (req, res) => {
  const input = BerthInput.parse(req.body);
  checkStatus(input);
  const berth = await prisma.berth.create({ data: input });
  await audit(req, "Berth", berth.id, "CREATE", input);
  res.status(201).json(berth);
}));

berths.patch("/berths/:id", canWrite, h(async (req, res) => {
  const input = BerthInput.partial().parse(req.body);
  checkStatus(input);
  const berth = await prisma.berth.update({ where: { id: String(req.params.id) }, data: input });
  await audit(req, "Berth", berth.id, "UPDATE", input);
  res.json(berth);
}));

berths.post("/berths/:id/blocks", canWrite, h(async (req, res) => {
  const input = z.object({ startOn: z.coerce.date(), endOn: z.coerce.date(), reason: z.string().min(1) }).parse(req.body);
  if (input.endOn < input.startOn) throw new HttpError(400, "End date is before start date");
  const block = await prisma.berthBlock.create({ data: { ...input, berthId: String(req.params.id) } });
  await audit(req, "Berth", block.berthId, "BLOCK", input);
  res.status(201).json(block);
}));
