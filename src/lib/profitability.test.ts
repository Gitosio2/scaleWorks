import { describe, expect, it } from "vitest";
import { aggregateProfitability, profitability } from "./profitability";

describe("profitability", () => {
  it("is price minus cost, per hour from tracked minutes", () => {
    expect(profitability({ priceCents: 20000, costCents: 5000, minutes: 600 })).toEqual({
      profitCents: 15000,
      centsPerHour: 1500,
    });
  });

  it("rounds the per-hour figure to the nearest cent", () => {
    // 10000 cents over 3 hours = 3333.33 / h
    expect(profitability({ priceCents: 10000, costCents: 0, minutes: 180 }).centsPerHour).toBe(3333);
  });

  it("knows nothing without a price", () => {
    expect(profitability({ priceCents: null, costCents: 500, minutes: 60 })).toEqual({
      profitCents: null,
      centsPerHour: null,
    });
  });

  it("has a profit but no hourly rate without tracked time", () => {
    expect(profitability({ priceCents: 1000, costCents: 400, minutes: 0 })).toEqual({
      profitCents: 600,
      centsPerHour: null,
    });
  });

  it("keeps a loss negative", () => {
    expect(profitability({ priceCents: 1000, costCents: 4000, minutes: 60 })).toEqual({
      profitCents: -3000,
      centsPerHour: -3000,
    });
  });
});

describe("aggregateProfitability", () => {
  it("averages profit over priced models and weights the hourly rate by time", () => {
    const result = aggregateProfitability([
      { priceCents: 20000, costCents: 5000, minutes: 600 }, // 15000 in 10 h
      { priceCents: 10000, costCents: 0, minutes: 0 }, // 10000, no time tracked
      { priceCents: null, costCents: 800, minutes: 120 }, // no price: ignored
      { priceCents: 5000, costCents: 1000, minutes: 120 }, // 4000 in 2 h
    ]);
    expect(result).toEqual({
      count: 3,
      profitCents: 29000,
      // 29000 over the 3 priced models, timed or not.
      avgProfitCents: 9667,
      // Only models with time count towards the rate: 19000 over 12 h.
      centsPerHour: 1583,
    });
  });

  it("handles no models", () => {
    expect(aggregateProfitability([])).toEqual({
      count: 0,
      profitCents: 0,
      avgProfitCents: null,
      centsPerHour: null,
    });
  });
});
