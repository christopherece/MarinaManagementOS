/** A meter reading. `reading` is the cumulative register value. */
export interface Reading {
  readAt: Date;
  reading: number;
}

export interface Usage {
  from: Date;
  to: Date;
  units: number;
  /** True when the register went backwards (meter replaced or rolled over). */
  needsReview: boolean;
}

/**
 * Usage between consecutive readings, in time order.
 * A backwards register is flagged for review and billed as 0 until checked.
 */
export function usageFromReadings(readings: Reading[]): Usage[] {
  const sorted = [...readings].sort((a, b) => a.readAt.getTime() - b.readAt.getTime());
  const out: Usage[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const diff = cur.reading - prev.reading;
    out.push({ from: prev.readAt, to: cur.readAt, units: diff < 0 ? 0 : diff, needsReview: diff < 0 });
  }
  return out;
}
