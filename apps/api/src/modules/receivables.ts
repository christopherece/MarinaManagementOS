import { Router } from "express";
import { z } from "zod";
import { agedTrialBalance } from "@mmos/domain";
import { prisma } from "../db.js";
import { h } from "../http.js";

export const receivables = Router();

/** Aged trial balance by customer as at a date (default today). */
receivables.get("/receivables/atb", h(async (req, res) => {
  const { asAt } = z.object({ asAt: z.coerce.date().default(() => new Date()) }).parse(req.query);
  const invoices = await prisma.invoice.findMany({
    where: { status: "POSTED", issuedOn: { lte: asAt } },
    include: { allocations: { include: { receipt: true } }, customer: true },
  });
  const byCustomer = new Map<string, { customer: string; items: { id: string; dueDate: Date; balanceCents: number }[] }>();
  for (const inv of invoices) {
    const paid = inv.allocations.filter((a) => a.receipt.receivedOn <= asAt).reduce((s, a) => s + a.cents, 0);
    const sign = inv.kind === "CREDIT_NOTE" ? -1 : 1;
    const balance = sign * inv.grossCents - paid;
    if (balance === 0) continue;
    const name = inv.customer.companyName ?? `${inv.customer.firstName ?? ""} ${inv.customer.surname ?? ""}`.trim();
    const entry = byCustomer.get(inv.customerId) ?? { customer: name, items: [] };
    entry.items.push({ id: inv.id, dueDate: inv.dueOn, balanceCents: balance });
    byCustomer.set(inv.customerId, entry);
  }
  res.json([...byCustomer.entries()].map(([customerId, e]) => ({ customerId, customer: e.customer, ...agedTrialBalance(e.items, asAt) })));
}));
