import type { DateRange } from "./dates.js";
import { inForceOn, toDay } from "./dates.js";

export type AgreementType =
  | "LICENCE"
  | "CASUAL"
  | "OWNERSHIP"
  | "SUBLEASE"
  | "PRIVATE_OCCUPANCY";

export type AgreementStatus = "QUOTE" | "BOOKED" | "RENTED" | "COMPLETED" | "CANCELLED";

export type OwnershipCategory = "PANUKU" | "PRIVATE";

/** Only Booked and Rented agreements hold a berth. */
export function holdsBerth(status: AgreementStatus): boolean {
  return status === "BOOKED" || status === "RENTED";
}

export interface Ownership extends DateRange {
  category: OwnershipCategory;
  ownerCustomerId: string;
}

/**
 * The ownership in force on the 1st of the month applies to the whole month.
 * If several overlap (bad data), the latest start wins.
 */
export function ownershipForMonth(
  ownerships: Ownership[],
  year: number,
  month1to12: number,
): Ownership | null {
  const first = new Date(Date.UTC(year, month1to12 - 1, 1));
  const inForce = ownerships.filter((o) => inForceOn(o, first));
  inForce.sort((a, b) => toDay(b.start).getTime() - toDay(a.start).getTime());
  return inForce[0] ?? null;
}

export interface HoldingAgreement extends DateRange {
  berthId: string;
  status: AgreementStatus;
}

/** True if a new agreement would clash with an existing one on the same berth. */
export function clashes(existing: HoldingAgreement[], candidate: HoldingAgreement): boolean {
  return existing.some(
    (e) =>
      e.berthId === candidate.berthId &&
      holdsBerth(e.status) &&
      toDay(e.start) <= toDay(candidate.end ?? new Date(8.64e15)) &&
      toDay(candidate.start) <= toDay(e.end ?? new Date(8.64e15)),
  );
}
