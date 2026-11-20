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
