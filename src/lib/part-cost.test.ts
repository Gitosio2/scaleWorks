import { describe, expect, it } from "vitest";
import { partCostCents, stockPartDelta } from "./part-cost";

describe("partCostCents", () => {
  it("uses the part's own price when it is not linked to stock", () => {
    expect(
      partCostCents({ priceCents: 1250, stockUnitPriceCents: null, quantity: null }),
    ).toBe(1250);
  });

  it("is zero for an unlinked part without a price", () => {
    expect(
      partCostCents({ priceCents: null, stockUnitPriceCents: null, quantity: null }),
    ).toBe(0);
  });

  it("derives a linked part from the stock unit price times the quantity", () => {
    expect(
      partCostCents({ priceCents: null, stockUnitPriceCents: 350, quantity: 4 }),
    ).toBe(1400);
  });

  it("ignores any stored price on a linked part", () => {
    expect(
      partCostCents({ priceCents: 99999, stockUnitPriceCents: 100, quantity: 2 }),
    ).toBe(200);
  });

  it("costs nothing when the linked component has no price", () => {
    expect(
      partCostCents({ priceCents: null, stockUnitPriceCents: null, quantity: 3 }),
    ).toBe(0);
  });
});

describe("stockPartDelta", () => {
  it("is the extra units to take from stock (positive) or give back (negative)", () => {
    expect(stockPartDelta(2, 5)).toBe(3);
    expect(stockPartDelta(5, 2)).toBe(-3);
    expect(stockPartDelta(4, 4)).toBe(0);
  });
});
