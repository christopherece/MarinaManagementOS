import { daysInclusive } from "./dates.js";
import type { Cents } from "./money.js";

export type AgeBucket = "CURRENT" | "DAYS_30" | "DAYS_60" | "DAYS_90_PLUS";

export interface OpenItem {
  id: string;
  dueDate: Date;
  /** Outstanding balance in cents (positive = owed by customer). */
  balanceCents: Cents;
}

/** Bucket by days past due as at a date. */
export function ageBucket(dueDate: Date, asAt: Date): AgeBucket {
  const overdue = daysInclusive(dueDate, asAt) - 1;
  if (overdue <= 0) return "CURRENT";
  if (overdue <= 30) return "DAYS_30";
  if (overdue <= 60) return "DAYS_60";
  return "DAYS_90_PLUS";
}

export function agedTrialBalance(items: OpenItem[], asAt: Date): Record<AgeBucket, Cents> & { total: Cents } {
  const out = { CURRENT: 0, DAYS_30: 0, DAYS_60: 0, DAYS_90_PLUS: 0, total: 0 };
  for (const i of items) {
    out[ageBucket(i.dueDate, asAt)] += i.balanceCents;
    out.total += i.balanceCents;
  }
  return out;
}

/** Allocate a receipt to open items, oldest due date first. */
export function allocateOldestFirst(
  items: OpenItem[],
  receiptCents: Cents,
): { allocations: { itemId: string; cents: Cents }[]; unallocatedCents: Cents } {
  const sorted = [...items].filter((i) => i.balanceCents > 0).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  let left = receiptCents;
  const allocations: { itemId: string; cents: Cents }[] = [];
  for (const i of sorted) {
    if (left <= 0) break;
    const take = Math.min(left, i.balanceCents);
    allocations.push({ itemId: i.id, cents: take });
    left -= take;
  }
  return { allocations, unallocatedCents: left };
}
