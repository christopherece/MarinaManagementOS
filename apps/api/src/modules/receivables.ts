import { Router } from "express";
import { z } from "zod";
import { agedTrialBalance } from "@mmos/domain";
import { prisma } from "../db.js";
import { h } from "../http.js";

export const receivables = Router();

/**
 * Aged trial balance by customer as at a date (default today).
 * Invoices age by due date. Receipt money not yet allocated to an invoice is a
 * credit on the customer's account and ages by the date it was received.
 */
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
  const receipts = await prisma.receipt.findMany({
    where: { receivedOn: { lte: asAt } },
    include: { allocations: { include: { invoice: true } }, customer: true },
  });
  for (const r of receipts) {
    // Allocations already reduced an invoice above only when that invoice is in this ATB.
    const counted = r.allocations
      .filter((a) => a.invoice.status === "POSTED" && a.invoice.issuedOn <= asAt)
      .reduce((s, a) => s + a.cents, 0);
    const unallocated = r.amountCents - counted;
    if (unallocated === 0) continue;
    const name = r.customer.companyName ?? `${r.customer.firstName ?? ""} ${r.customer.surname ?? ""}`.trim();
    const entry = byCustomer.get(r.customerId) ?? { customer: name, items: [] };
    entry.items.push({ id: r.id, dueDate: r.receivedOn, balanceCents: -unallocated });
    byCustomer.set(r.customerId, entry);
  }
  res.json([...byCustomer.entries()].map(([customerId, e]) => ({ customerId, customer: e.customer, ...agedTrialBalance(e.items, asAt) })));
}));
