import type { OwnershipCategory } from "./agreements.js";

/** One berth's figures for one period (usually a month). */
export interface BerthPeriod {
  berthId: string;
  /** Days the berth was available to rent (PacSoft RMADays). */
  availableDays: number;
  /** Days invoiced to customers (PacSoft InvoicedUnits). */
  paidDays: number;
  /** Ownership in force on the 1st of the period, if any. */
  ownership: OwnershipCategory | null;
}

export interface OccupancyResult {
  availableDays: number;
  occupiedDays: number;
  /** 0..1, or null when there are no available days. */
  occupancy: number | null;
}

/**
 * Occupancy = sum of occupied days / sum of available days.
 * - Paid days are capped at available days per berth (some berths over-invoice).
 * - A private berth with an ownership in force is 100% occupied: the owner
 *   pays regardless of invoicing (decision 30 Sep 2026).
 */
export function occupancy(rows: BerthPeriod[]): OccupancyResult {
  let available = 0;
  let occupied = 0;
  for (const r of rows) {
    const avail = Math.max(0, r.availableDays);
    available += avail;
    occupied += r.ownership === "PRIVATE" ? avail : Math.min(Math.max(0, r.paidDays), avail);
  }
  return {
    availableDays: available,
    occupiedDays: occupied,
    occupancy: available === 0 ? null : occupied / available,
  };
}

/** Utilisation = vessel length / berth length, summed over berths. */
export function utilisation(rows: { vesselLength: number; berthLength: number }[]): number | null {
  const berth = rows.reduce((s, r) => s + r.berthLength, 0);
  const vessel = rows.reduce((s, r) => s + r.vesselLength, 0);
  return berth === 0 ? null : vessel / berth;
}
