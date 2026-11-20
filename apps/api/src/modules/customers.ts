import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { writeRoles } from "../auth.js";
import { audit } from "../audit.js";
import { h, HttpError } from "../http.js";

export const customers = Router();
const canWrite = writeRoles("BERTH_OFFICE", "FINANCE");

const metres = z.number().positive().max(200);
const optionalText = z.string().trim().max(200).nullable().optional();

customers.get("/customers", h(async (req, res) => {
  const { q } = z.object({ q: z.string().trim().optional() }).parse(req.query);
  const contains = (s: string) => ({ contains: s, mode: "insensitive" as const });
  const where = q
    ? {
        OR: [
          { surname: contains(q) },
          { firstName: contains(q) },
          { companyName: contains(q) },
          { email: contains(q) },
          { mobile: contains(q) },
          { vessels: { some: { name: contains(q) } } },
        ],
      }
    : {};
  res.json(await prisma.customer.findMany({
    where,
    take: 100,
    include: { vessels: { select: { id: true, name: true, lengthM: true } } },
    orderBy: [{ surname: "asc" }, { companyName: "asc" }],
  }));
}));

customers.get("/customers/:id", h(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: String(req.params.id) },
    include: {
      vessels: { include: { documents: { orderBy: { expiresOn: "asc" } } }, orderBy: { name: "asc" } },
      agreements: { include: { berth: true, vessel: true }, orderBy: { startOn: "desc" }, take: 20 },
    },
  });
  if (!customer) throw new HttpError(404, "Customer not found");
  const notes = await prisma.note.findMany({ where: { entity: "Customer", entityId: customer.id }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ ...customer, notes });
}));

const CustomerInput = z.object({
  isCompany: z.boolean().default(false),
  firstName: optionalText,
  surname: optionalText,
  companyName: optionalText,
  email: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
  mobile: optionalText,
  addressLines: z.array(z.string().trim().max(100)).max(5).default([]),
  postcode: optionalText,
  countryCode: z.string().length(2).default("NZ"),
  emailStatements: z.boolean().default(true),
});

function checkName(c: { isCompany?: boolean; surname?: string | null; companyName?: string | null }) {
  if (c.isCompany ? !c.companyName : !c.surname) {
    throw new HttpError(400, c.isCompany ? "A company needs a company name" : "A person needs a surname");
  }
}

customers.post("/customers", canWrite, h(async (req, res) => {
  const input = CustomerInput.parse(req.body);
  checkName(input);
  const customer = await prisma.customer.create({ data: input });
  await audit(req, "Customer", customer.id, "CREATE");
  res.status(201).json(customer);
}));

customers.patch("/customers/:id", canWrite, h(async (req, res) => {
  const id = String(req.params.id);
  const input = CustomerInput.partial().parse(req.body);
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Customer not found");
  checkName({ ...existing, ...input });
  const customer = await prisma.customer.update({ where: { id }, data: input });
  await audit(req, "Customer", id, "UPDATE", Object.keys(input));
  res.json(customer);
}));

customers.post("/customers/:id/notes", canWrite, h(async (req, res) => {
  const input = z.object({ kind: z.enum(["NOTE", "CALL", "EMAIL", "LETTER"]).default("NOTE"), body: z.string().trim().min(1).max(5000) }).parse(req.body);
  const note = await prisma.note.create({ data: { ...input, entity: "Customer", entityId: String(req.params.id), createdById: req.user?.id } });
  res.status(201).json(note);
}));

const VesselInput = z.object({
  ownerId: z.string(),
  name: z.string().trim().min(1).max(100),
  lengthM: metres,
  beamM: metres.nullable().optional(),
  draftM: metres.nullable().optional(),
  shorePowerReq: optionalText,
});

customers.get("/vessels/:id", h(async (req, res) => {
  const vessel = await prisma.vessel.findUnique({
    where: { id: String(req.params.id) },
    include: { owner: true, documents: { orderBy: { expiresOn: "asc" } }, agreements: { include: { berth: true }, orderBy: { startOn: "desc" }, take: 20 } },
  });
  if (!vessel) throw new HttpError(404, "Vessel not found");
  res.json(vessel);
}));

customers.post("/vessels", canWrite, h(async (req, res) => {
  const input = VesselInput.parse(req.body);
  const vessel = await prisma.vessel.create({ data: input });
  await audit(req, "Vessel", vessel.id, "CREATE", input);
  res.status(201).json(vessel);
}));

customers.patch("/vessels/:id", canWrite, h(async (req, res) => {
  const input = VesselInput.partial().parse(req.body);
  const vessel = await prisma.vessel.update({ where: { id: String(req.params.id) }, data: input });
  await audit(req, "Vessel", vessel.id, "UPDATE", input);
  res.json(vessel);
}));

const DocumentInput = z.object({
  kind: z.enum(["INSURANCE", "ELECTRICAL_WOF", "TAG_AND_TEST"]),
  provider: optionalText,
  reference: optionalText,
  issuedOn: z.coerce.date().nullable().optional(),
  expiresOn: z.coerce.date().nullable().optional(),
});

customers.post("/vessels/:id/documents", canWrite, h(async (req, res) => {
  const input = DocumentInput.parse(req.body);
  if (input.issuedOn && input.expiresOn && input.expiresOn < input.issuedOn) throw new HttpError(400, "Expiry is before issue date");
  const doc = await prisma.complianceDocument.create({ data: { ...input, vesselId: String(req.params.id) } });
  await audit(req, "Vessel", doc.vesselId, "DOCUMENT", input);
  res.status(201).json(doc);
}));

/**
 * Compliance list: vessels on a current agreement whose latest document of each
 * kind is missing, expired, or expires within `days` (default 30).
 */
customers.get("/compliance", h(async (req, res) => {
  const { days } = z.object({ days: z.coerce.number().int().min(0).max(365).default(30) }).parse(req.query);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const until = new Date(today.getTime() + days * 86_400_000);
  const vessels = await prisma.vessel.findMany({
    where: { agreements: { some: { status: { in: ["BOOKED", "RENTED"] }, OR: [{ endOn: null }, { endOn: { gte: today } }] } } },
    include: {
      owner: true,
      documents: true,
      agreements: { where: { status: { in: ["BOOKED", "RENTED"] } }, include: { berth: true }, take: 1 },
    },
  });
  const kinds = ["INSURANCE", "ELECTRICAL_WOF", "TAG_AND_TEST"] as const;
  const rows = [];
  for (const v of vessels) {
    for (const kind of kinds) {
      const latest = v.documents
        .filter((d) => d.kind === kind)
        .sort((a, b) => (b.expiresOn?.getTime() ?? 0) - (a.expiresOn?.getTime() ?? 0))[0];
      const expiresOn = latest?.expiresOn ?? null;
      type State = "MISSING" | "EXPIRED" | "EXPIRING";
      const state: State | null = !latest || !expiresOn ? "MISSING" : expiresOn < today ? "EXPIRED" : expiresOn <= until ? "EXPIRING" : null;
      if (!state) continue;
      rows.push({
        vesselId: v.id,
        vessel: v.name,
        owner: v.owner.companyName ?? [v.owner.firstName, v.owner.surname].filter(Boolean).join(" "),
        ownerId: v.ownerId,
        berth: v.agreements[0]?.berth.name ?? null,
        kind,
        state,
        expiresOn,
      });
    }
  }
  const order = { EXPIRED: 0, MISSING: 1, EXPIRING: 2 } as const;
  rows.sort((a, b) => order[a.state] - order[b.state] || (a.expiresOn?.getTime() ?? 0) - (b.expiresOn?.getTime() ?? 0));
  res.json(rows);
}));
