import { describe, expect, it } from "vitest";
import { usageFromReadings } from "../src/index.js";

const t = (s: string) => new Date(`${s}T08:00:00Z`);

describe("usageFromReadings", () => {
  it("diffs consecutive readings in time order and flags a backwards register", () => {
    const u = usageFromReadings([
      { readAt: t("2026-11-01"), reading: 1200 },
      { readAt: t("2026-10-01"), reading: 1000 },
      { readAt: t("2026-12-01"), reading: 50 },
    ]);
    expect(u.map((x) => [x.units, x.needsReview])).toEqual([
      [200, false],
      [0, true],
    ]);
  });
});
