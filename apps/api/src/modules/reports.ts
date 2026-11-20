import { Router } from "express";
import { z } from "zod";
import { monthRange, occupancy, operatingDays, ownershipForMonth, paidDaysInPeriod, type BerthPeriod } from "@mmos/domain";
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
    // Inactive berths are out of service and add no capacity. Decommissioned berths
    // still count for the days before their decommissioning date.
    where: {
      marinaId: q.marinaId,
      status: { not: "INACTIVE" },
      OR: [{ decommissionedOn: null }, { decommissionedOn: { gt: period.start } }],
    },
    include: {
      blocks: true,
      agreements: { where: { type: "OWNERSHIP", status: { in: ["BOOKED", "RENTED", "COMPLETED"] } } },
      invoiceLines: { where: { invoice: { status: "POSTED", kind: "INVOICE" }, periodFrom: { lte: period.end }, periodTo: { gte: period.start } } },
    },
  });
  const rows: BerthPeriod[] = berths.map((b) => {
    const availableDays = operatingDays(period, b.decommissionedOn, b.blocks.map((x) => ({ start: x.startOn, end: x.endOn })));
    const paidDays = b.invoiceLines.reduce((s, l) => s + paidDaysInPeriod(l, period), 0);
    const own = ownershipForMonth(
      b.agreements
        .filter((a) => a.ownershipCategory)
        .map((a) => ({ start: a.startOn, end: a.endOn, category: a.ownershipCategory!, ownerCustomerId: a.ownerId ?? a.customerId })),
      q.year,
      q.month,
    );
    return { berthId: b.id, availableDays, paidDays, ownership: own?.category ?? null };
  });
  res.json({ ...occupancy(rows), berths: rows.length });
}));
