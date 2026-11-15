import { describe, expect, it } from "vitest";
import { holdingValueCents, isSold, nextEstimatedValueAt, profitCents } from "./collection";

const base = {
  purchasePriceCents: null,
  estimatedValueCents: null,
  soldPriceCents: null,
  soldDate: null,
};

describe("isSold", () => {
  it("is sold only when a sold date is set", () => {
    expect(isSold({ ...base, soldDate: "2026-03-01" })).toBe(true);
    expect(isSold(base)).toBe(false);
  });

  it("does not depend on the sold price", () => {
    expect(isSold({ ...base, soldDate: "2026-03-01", soldPriceCents: null })).toBe(true);
    expect(isSold({ ...base, soldPriceCents: 5000 })).toBe(false);
  });
});

describe("profitCents", () => {
  const sold = { ...base, soldDate: "2026-03-01" };

  it("is the sale price minus the purchase price", () => {
    expect(profitCents({ ...sold, purchasePriceCents: 4000, soldPriceCents: 6500 })).toBe(2500);
  });

  it("can be a loss", () => {
    expect(profitCents({ ...sold, purchasePriceCents: 6500, soldPriceCents: 4000 })).toBe(-2500);
  });

  it("treats a zero price as known", () => {
    expect(profitCents({ ...sold, purchasePriceCents: 0, soldPriceCents: 1000 })).toBe(1000);
  });

  it("is unknown when an item is not sold", () => {
    expect(profitCents({ ...base, purchasePriceCents: 4000, soldPriceCents: 6500 })).toBeNull();
  });

  it("is unknown when either price is missing", () => {
    expect(profitCents({ ...sold, purchasePriceCents: null, soldPriceCents: 6500 })).toBeNull();
    expect(profitCents({ ...sold, purchasePriceCents: 4000, soldPriceCents: null })).toBeNull();
  });
});

describe("holdingValueCents", () => {
  it("is the estimated value while the item is kept", () => {
    expect(holdingValueCents({ ...base, estimatedValueCents: 9000 })).toBe(9000);
  });

  it("is unknown without an estimate", () => {
    expect(holdingValueCents(base)).toBeNull();
  });

  it("is unknown once the item is sold", () => {
    expect(
      holdingValueCents({ ...base, estimatedValueCents: 9000, soldDate: "2026-03-01" }),
    ).toBeNull();
  });
});

describe("nextEstimatedValueAt", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const before = new Date("2026-01-10T09:00:00Z");

  it("clears the date when the new estimate is empty", () => {
    expect(nextEstimatedValueAt(9000, before, null, now)).toBeNull();
    expect(nextEstimatedValueAt(null, null, null, now)).toBeNull();
  });

  it("stamps now when the estimate is new or changed", () => {
    expect(nextEstimatedValueAt(null, null, 9000, now)).toEqual(now);
    expect(nextEstimatedValueAt(9000, before, 9500, now)).toEqual(now);
    expect(nextEstimatedValueAt(9000, before, 0, now)).toEqual(now);
  });

  it("keeps the stored date when the estimate is unchanged", () => {
    expect(nextEstimatedValueAt(9000, before, 9000, now)).toEqual(before);
  });

  it("stamps now when an unchanged estimate has no stored date", () => {
    expect(nextEstimatedValueAt(9000, null, 9000, now)).toEqual(now);
  });
});
