/** Money is held in integer cents to avoid floating point errors. */
export type Cents = number;

export const NZ_GST_RATE = 0.15;

export function round(c: number): Cents {
  return Math.round(c);
}

export function gstOn(netCents: Cents, rate = NZ_GST_RATE): Cents {
  return round(netCents * rate);
}

/** GST component of a GST-inclusive amount. */
export function gstFromGross(grossCents: Cents, rate = NZ_GST_RATE): Cents {
  return round((grossCents * rate) / (1 + rate));
}
