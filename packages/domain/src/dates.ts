/** Calendar-date helpers. All dates are treated as whole days in UTC. */

const DAY_MS = 86_400_000;

/** Strip the time part so comparisons are by calendar date only. */
export function toDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Inclusive number of days from start to end (same day = 1). */
export function daysInclusive(start: Date, end: Date): number {
  const n = Math.round((toDay(end).getTime() - toDay(start).getTime()) / DAY_MS) + 1;
  return Math.max(0, n);
}

export interface DateRange {
  start: Date;
  /** Inclusive end. `null` means open-ended (still current). */
  end: Date | null;
}

/** Inclusive days where two ranges overlap. */
export function overlapDays(a: DateRange, b: { start: Date; end: Date }): number {
  const start = toDay(a.start) > toDay(b.start) ? a.start : b.start;
  const aEnd = a.end ?? b.end;
  const end = toDay(aEnd) < toDay(b.end) ? aEnd : b.end;
  return toDay(start) > toDay(end) ? 0 : daysInclusive(start, end);
}

export function monthRange(year: number, month1to12: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month1to12 - 1, 1)),
    end: new Date(Date.UTC(year, month1to12, 0)),
  };
}

/** True if the range is in force on the given day. */
export function inForceOn(r: DateRange, day: Date): boolean {
  const d = toDay(day);
  return toDay(r.start) <= d && (r.end === null || toDay(r.end) >= d);
}

/**
 * Days a berth can be rented within a period: the days before it was
 * decommissioned, minus distinct blocked days (overlapping blocks count once,
 * blocks outside the operating window are ignored).
 */
export function operatingDays(
  period: { start: Date; end: Date },
  decommissionedOn: Date | null,
  blocks: { start: Date; end: Date }[],
): number {
  const start = toDay(period.start);
  let end = toDay(period.end);
  if (decommissionedOn) {
    const lastDay = new Date(toDay(decommissionedOn).getTime() - DAY_MS);
    if (lastDay < end) end = lastDay;
  }
  if (end < start) return 0;
  const clipped = blocks
    .map((b) => ({ s: toDay(b.start) < start ? start : toDay(b.start), e: toDay(b.end) > end ? end : toDay(b.end) }))
    .filter((b) => b.s <= b.e)
    .sort((a, b) => a.s.getTime() - b.s.getTime());
  let blocked = 0;
  let curS: Date | null = null;
  let curE: Date | null = null;
  for (const b of clipped) {
    if (curE && b.s.getTime() <= curE.getTime() + DAY_MS) {
      if (b.e > curE) curE = b.e;
    } else {
      if (curS && curE) blocked += daysInclusive(curS, curE);
      curS = b.s;
      curE = b.e;
    }
  }
  if (curS && curE) blocked += daysInclusive(curS, curE);
  return daysInclusive(start, end) - blocked;
}

/**
 * Paid days an invoice line contributes to a period. A recorded day quantity
 * wins over the calendar span; for lines that span several periods it is
 * shared out in proportion to the days in each period.
 */
export function paidDaysInPeriod(
  line: { periodFrom: Date | null; periodTo: Date | null; days: number | null },
  period: { start: Date; end: Date },
): number {
  if (!line.periodFrom || !line.periodTo) return line.days ?? 0;
  const inPeriod = overlapDays({ start: line.periodFrom, end: line.periodTo }, period);
  if (line.days === null) return inPeriod;
  const span = daysInclusive(line.periodFrom, line.periodTo);
  return span === 0 ? 0 : (line.days * inPeriod) / span;
}
