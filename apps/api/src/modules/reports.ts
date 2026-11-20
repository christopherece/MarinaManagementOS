import { Router } from "express";
import { z } from "zod";
import { monthRange, occupancy, overlapDays, ownershipForMonth, type BerthPeriod } from "@mmos/domain";
import { prisma } from "../db.js";
import { h } from "../http.js";

export const reports = Router();

/**
 * Monthly occupancy for a marina: paid days (capped at available days per berth)
 * over available days. Private berths with an ownership in force on the 1st count
 * as fully occupied.
 */
reports.get("/reports/occupancy", h(async (req, res) => {
  const q = z.object({ marinaId: z.string(), year: z.coerce.number().int(), month: z.coerce.number().int().min(1).max(12) }).parse(req.query);
  const period = monthRange(q.year, q.month);
  const berths = await prisma.berth.findMany({
    where: { marinaId: q.marinaId, OR: [{ decommissionedOn: null }, { decommissionedOn: { gt: period.start } }] },
    include: {
      blocks: true,
      agreements: { where: { type: "OWNERSHIP", status: { in: ["BOOKED", "RENTED", "COMPLETED"] } } },
      invoiceLines: { where: { invoice: { status: "POSTED", kind: "INVOICE" }, periodFrom: { lte: period.end }, periodTo: { gte: period.start } } },
    },
  });
  const rows: BerthPeriod[] = berths.map((b) => {
    const blocked = b.blocks.reduce((s, x) => s + overlapDays({ start: x.startOn, end: x.endOn }, period), 0);
    const end = b.decommissionedOn && b.decommissionedOn <= period.end ? new Date(b.decommissionedOn.getTime() - 86_400_000) : period.end;
    const availableDays = Math.max(0, overlapDays({ start: period.start, end }, period) - blocked);
    const paidDays = b.invoiceLines.reduce(
      (s, l) => s + (l.periodFrom && l.periodTo ? overlapDays({ start: l.periodFrom, end: l.periodTo }, period) : (l.days ?? 0)),
      0,
    );
    const own = ownershipForMonth(
      b.agreements.filter((a) => a.ownershipCategory && a.ownerId).map((a) => ({ start: a.startOn, end: a.endOn, category: a.ownershipCategory!, ownerCustomerId: a.ownerId! })),
      q.year,
      q.month,
    );
    return { berthId: b.id, availableDays, paidDays, ownership: own?.category ?? null };
  });
  res.json({ ...occupancy(rows), berths: rows.length });
}));
