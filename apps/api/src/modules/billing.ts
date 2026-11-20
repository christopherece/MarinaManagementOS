import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { h } from "../http.js";

export const billing = Router();

billing.get("/products", h(async (_req, res) => {
  res.json(await prisma.product.findMany({ include: { rates: true } }));
}));

billing.get("/invoices", h(async (req, res) => {
  const q = z.object({ customerId: z.string().optional() }).parse(req.query);
  res.json(await prisma.invoice.findMany({ where: q, include: { lines: true }, orderBy: { issuedOn: "desc" }, take: 200 }));
}));

/**
 * Billing run: creates a DRAFT run for the period. Line generation
 * (domain `billPeriod` for every holding agreement) is the next step in PLAN.md.
 */
billing.post("/billing-runs", h(async (req, res) => {
  const input = z.object({ periodFrom: z.coerce.date(), periodTo: z.coerce.date(), marinaId: z.string().optional() }).parse(req.body);
  res.status(201).json(await prisma.billingRun.create({ data: input }));
}));
