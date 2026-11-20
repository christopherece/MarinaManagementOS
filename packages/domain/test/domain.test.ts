import { describe, expect, it } from "vitest";
import {
  occupancy,
  ownershipForMonth,
  clashes,
  billPeriod,
  monthRange,
  agedTrialBalance,
  allocateOldestFirst,
  gstFromGross,
} from "../src/index.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("occupancy", () => {
  it("caps paid days at available days and counts private ownership as full", () => {
    const r = occupancy([
      { berthId: "A1", availableDays: 31, paidDays: 40, ownership: "PANUKU" }, // capped to 31
      { berthId: "A2", availableDays: 31, paidDays: 10, ownership: null },
      { berthId: "A3", availableDays: 31, paidDays: 0, ownership: "PRIVATE" }, // counts 31
      { berthId: "A4", availableDays: 31, paidDays: 0, ownership: "PANUKU" },
    ]);
    expect(r.availableDays).toBe(124);
    expect(r.occupiedDays).toBe(72);
    expect(r.occupancy).toBeCloseTo(72 / 124);
  });

  it("returns null with no available days", () => {
    expect(occupancy([]).occupancy).toBeNull();
  });
});

describe("ownershipForMonth", () => {
  it("uses the ownership in force on the 1st", () => {
    const owns = [
      { start: d("2020-01-01"), end: d("2026-09-29"), category: "PRIVATE" as const, ownerCustomerId: "c1" },
      { start: d("2026-09-30"), end: null, category: "PANUKU" as const, ownerCustomerId: "council" },
    ];
    expect(ownershipForMonth(owns, 2026, 9)?.category).toBe("PRIVATE");
    expect(ownershipForMonth(owns, 2026, 10)?.category).toBe("PANUKU");
  });
});

describe("clashes", () => {
  it("blocks overlapping holding agreements on the same berth only", () => {
    const existing = [{ berthId: "B1", status: "RENTED" as const, start: d("2026-01-01"), end: d("2026-12-31") }];
    expect(clashes(existing, { berthId: "B1", status: "BOOKED", start: d("2026-12-31"), end: null })).toBe(true);
    expect(clashes(existing, { berthId: "B1", status: "BOOKED", start: d("2027-01-01"), end: null })).toBe(false);
    expect(clashes(existing, { berthId: "B2", status: "BOOKED", start: d("2026-06-01"), end: null })).toBe(false);
    const cancelled = [{ ...existing[0]!, status: "CANCELLED" as const }];
    expect(clashes(cancelled, { berthId: "B1", status: "BOOKED", start: d("2026-06-01"), end: null })).toBe(false);
  });
});

describe("billPeriod", () => {
  it("prorates a monthly per-metre rate by days held, plus 15% GST", () => {
    const line = billPeriod(
      { start: d("2026-11-16"), end: null },
      monthRange(2026, 11),
      { basis: "PER_METRE_PER_MONTH", amountCents: 3000 },
      12,
    );
    expect(line.days).toBe(15);
    expect(line.netCents).toBe(18000); // 30.00 * 12m * 15/30
    expect(line.gstCents).toBe(2700);
    expect(line.grossCents).toBe(20700);
  });

  it("takes GST out of a gross amount", () => {
    expect(gstFromGross(11500)).toBe(1500);
  });
});

describe("receivables", () => {
  const items = [
    { id: "i1", dueDate: d("2026-07-20"), balanceCents: 1000 },
    { id: "i2", dueDate: d("2026-10-01"), balanceCents: 2000 },
    { id: "i3", dueDate: d("2026-11-30"), balanceCents: 3000 },
  ];

  it("ages balances into buckets", () => {
    const atb = agedTrialBalance(items, d("2026-11-20"));
    expect(atb).toEqual({ CURRENT: 3000, DAYS_30: 0, DAYS_60: 2000, DAYS_90_PLUS: 1000, total: 6000 });
  });

  it("allocates receipts oldest first", () => {
    const r = allocateOldestFirst(items, 2500);
    expect(r.allocations).toEqual([
      { itemId: "i1", cents: 1000 },
      { itemId: "i2", cents: 1500 },
    ]);
    expect(r.unallocatedCents).toBe(0);
  });
});

import { operatingDays, paidDaysInPeriod } from "../src/index.js";

describe("operatingDays", () => {
  const nov = monthRange(2026, 11);
  it("counts overlapping blocks once", () => {
    expect(operatingDays(nov, null, [
      { start: d("2026-11-05"), end: d("2026-11-10") },
      { start: d("2026-11-08"), end: d("2026-11-12") },
      { start: d("2026-11-08"), end: d("2026-11-12") },
    ])).toBe(22);
  });
  it("stops at decommissioning and ignores blocks after it", () => {
    expect(operatingDays(nov, d("2026-11-16"), [{ start: d("2026-11-20"), end: d("2026-11-25") }])).toBe(15);
    expect(operatingDays(nov, d("2026-11-01"), [])).toBe(0);
  });
});

describe("paidDaysInPeriod", () => {
  const nov = monthRange(2026, 11);
  it("uses the recorded day quantity over the calendar span", () => {
    expect(paidDaysInPeriod({ periodFrom: d("2026-11-01"), periodTo: d("2026-11-30"), days: 10 }, nov)).toBe(10);
    expect(paidDaysInPeriod({ periodFrom: d("2026-11-01"), periodTo: d("2026-11-30"), days: 0 }, nov)).toBe(0);
  });
  it("shares a cross-month quantity by days in each month", () => {
    expect(paidDaysInPeriod({ periodFrom: d("2026-11-16"), periodTo: d("2026-12-15"), days: 30 }, nov)).toBe(15);
  });
  it("falls back to the calendar span when no quantity is recorded", () => {
    expect(paidDaysInPeriod({ periodFrom: d("2026-11-21"), periodTo: d("2026-12-31"), days: null }, nov)).toBe(10);
  });
});
