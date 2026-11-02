import { describe, expect, it } from "vitest";
import { consumableCost } from "./consumable-cost";

describe("consumableCost", () => {
  it("rounds half-cents up like the SQL on the models list", () => {
    // 25 x 0.58 is 14.499999999999998 in floating point, but exactly 14.5.
    expect(25 * 0.58).toBeLessThan(14.5);
    expect(consumableCost(25, "0.58")).toBe(15);
  });

  it("rounds other half-cents up", () => {
    expect(consumableCost(50, "0.25")).toBe(13); // 12.5
    expect(consumableCost(10, "0.05")).toBe(1); // 0.5
    expect(consumableCost(35, "0.1")).toBe(4); // 3.5
  });

  it("rounds below a half-cent down", () => {
    expect(consumableCost(10, "0.04")).toBe(0);
    expect(consumableCost(33, "0.3")).toBe(10); // 9.9
    expect(consumableCost(7, "0.07")).toBe(0); // 0.49
  });

  it("is exact for whole results", () => {
    expect(consumableCost(1200, "0.25")).toBe(300);
    expect(consumableCost(999, "1")).toBe(999);
    expect(consumableCost(350, "2")).toBe(700);
  });

  it("handles zero price and zero quantity", () => {
    expect(consumableCost(0, "0.5")).toBe(0);
    expect(consumableCost(100, "0")).toBe(0);
  });

  it("is null when the price or the quantity is unknown", () => {
    expect(consumableCost(null, "0.5")).toBeNull();
    expect(consumableCost(100, null)).toBeNull();
    expect(consumableCost(null, null)).toBeNull();
  });

  it("accepts the numeric strings the database returns", () => {
    expect(consumableCost(2500, "0.3333")).toBe(833); // 833.25
  });
});
