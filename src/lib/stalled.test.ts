import { describe, expect, it } from "vitest";
import { STALLED_MONTHS, stalledCutoff } from "./stalled";

// The cutoff uses local-time month arithmetic, so build expectations the same
// way (local constructors) instead of from UTC strings.
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("stalledCutoff", () => {
  it("uses a seven month window", () => {
    expect(STALLED_MONTHS).toBe(7);
  });

  it("goes back seven calendar months", () => {
    expect(stalledCutoff(local(2026, 11, 2))).toEqual(local(2026, 4, 2));
  });

  it("crosses the year boundary", () => {
    expect(stalledCutoff(local(2026, 3, 15))).toEqual(local(2025, 8, 15));
    expect(stalledCutoff(local(2026, 7, 31))).toEqual(local(2025, 12, 31));
  });

  it("does not mutate its input", () => {
    const now = local(2026, 11, 2);
    const copy = new Date(now);
    stalledCutoff(now);
    expect(now).toEqual(copy);
  });

  it("overflows into the next month when the target day does not exist", () => {
    // 2026-09-30 minus 7 months = Feb 30 -> Mar 2 (2026 is not a leap year).
    expect(stalledCutoff(local(2026, 9, 30))).toEqual(local(2026, 3, 2));
  });

  it("treats a model as stalled only when created strictly before the cutoff", () => {
    const cutoff = stalledCutoff(local(2026, 11, 2));
    const day = 86_400_000;
    const isStalled = (createdAt: Date) => createdAt < cutoff;
    expect(isStalled(new Date(cutoff.getTime() - day))).toBe(true);
    expect(isStalled(new Date(cutoff.getTime()))).toBe(false);
    expect(isStalled(new Date(cutoff.getTime() + day))).toBe(false);
  });
});
