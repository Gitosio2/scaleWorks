import { describe, expect, it } from "vitest";
import { canHold, nextHold } from "./payment-hold";

const now = new Date("2026-11-02T10:00:00Z");
const earlier = new Date("2026-10-01T10:00:00Z");

describe("canHold", () => {
  it("allows a hold while something is still owed", () => {
    expect(canHold("none")).toBe(true);
    expect(canHold("deposit_paid")).toBe(true);
  });

  it("does not allow a hold on a model paid in full", () => {
    expect(canHold("paid")).toBe(false);
  });
});

describe("nextHold", () => {
  it("stamps the moment the hold is set", () => {
    expect(nextHold({ current: null, requested: true, status: "none", now })).toEqual(now);
  });

  it("keeps the original date when the hold is already set", () => {
    expect(nextHold({ current: earlier, requested: true, status: "deposit_paid", now })).toEqual(earlier);
  });

  it("clears the hold when asked", () => {
    expect(nextHold({ current: earlier, requested: false, status: "none", now })).toBeNull();
  });

  it("never holds a model that is paid in full", () => {
    expect(nextHold({ current: earlier, requested: true, status: "paid", now })).toBeNull();
    expect(nextHold({ current: null, requested: true, status: "paid", now })).toBeNull();
  });
});
