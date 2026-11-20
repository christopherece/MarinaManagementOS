import { overlapDays, daysInclusive, type DateRange } from "./dates.js";
import { gstOn, round, type Cents } from "./money.js";

export type RateBasis = "PER_METRE_PER_DAY" | "PER_METRE_PER_MONTH" | "FLAT_PER_MONTH" | "FLAT_PER_DAY";

export interface Rate {
  basis: RateBasis;
  /** GST-exclusive amount in cents for one unit of the basis. */
  amountCents: Cents;
}

export interface BillingLine {
  days: number;
  netCents: Cents;
  gstCents: Cents;
  grossCents: Cents;
}

/**
 * Bill one agreement for one billing period, prorated by days held.
 * Monthly rates are prorated as rate * days held / days in period.
 */
export function billPeriod(
  agreement: DateRange,
  period: { start: Date; end: Date },
  rate: Rate,
  lengthMetres: number,
): BillingLine {
  const days = overlapDays(agreement, period);
  const periodDays = daysInclusive(period.start, period.end);
  let net: number;
  switch (rate.basis) {
    case "PER_METRE_PER_DAY":
      net = rate.amountCents * lengthMetres * days;
      break;
    case "PER_METRE_PER_MONTH":
      net = (rate.amountCents * lengthMetres * days) / periodDays;
      break;
    case "FLAT_PER_MONTH":
      net = (rate.amountCents * days) / periodDays;
      break;
    case "FLAT_PER_DAY":
      net = rate.amountCents * days;
      break;
  }
  const netCents = round(net);
  const gstCents = gstOn(netCents);
  return { days, netCents, gstCents, grossCents: netCents + gstCents };
}
