import { describe, expect, it } from "vitest";
import { parseDate, todayInMadrid } from "./dates";
import type { ActionT } from "./labels";

const t: ActionT = (key) => key;

describe("todayInMadrid", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayInMadrid(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-15");
  });

  it("rolls to the next day after local midnight in summer (UTC+2)", () => {
    expect(todayInMadrid(new Date("2026-06-15T21:59:59Z"))).toBe("2026-06-15");
    expect(todayInMadrid(new Date("2026-06-15T22:00:00Z"))).toBe("2026-06-16");
  });

  it("rolls to the next day after local midnight in winter (UTC+1)", () => {
    expect(todayInMadrid(new Date("2026-01-15T22:59:59Z"))).toBe("2026-01-15");
    expect(todayInMadrid(new Date("2026-01-15T23:00:00Z"))).toBe("2026-01-16");
  });

  it("crosses the year boundary ahead of UTC", () => {
    expect(todayInMadrid(new Date("2025-12-31T23:30:00Z"))).toBe("2026-01-01");
  });

  it("follows the DST switch days", () => {
    // Spring forward: 2026-03-29 02:00 -> 03:00 (offset becomes +2).
    expect(todayInMadrid(new Date("2026-03-28T22:59:59Z"))).toBe("2026-03-28");
    expect(todayInMadrid(new Date("2026-03-28T23:00:00Z"))).toBe("2026-03-29");
    expect(todayInMadrid(new Date("2026-03-29T21:59:59Z"))).toBe("2026-03-29");
    expect(todayInMadrid(new Date("2026-03-29T22:00:00Z"))).toBe("2026-03-30");
    // Fall back: 2026-10-25 03:00 -> 02:00 (offset becomes +1).
    expect(todayInMadrid(new Date("2026-10-25T22:59:59Z"))).toBe("2026-10-25");
    expect(todayInMadrid(new Date("2026-10-25T23:00:00Z"))).toBe("2026-10-26");
  });
});

describe("parseDate", () => {
  it("returns null for empty input", () => {
    expect(parseDate("", t)).toBeNull();
    expect(parseDate("  ", t)).toBeNull();
  });

  it("accepts a real calendar date", () => {
    expect(parseDate("2026-03-05", t)).toBe("2026-03-05");
    expect(parseDate(" 2024-02-29 ", t)).toBe("2024-02-29");
  });

  it("rejects malformed or impossible dates", () => {
    for (const value of ["2026-3-5", "05/03/2026", "2026-13-01", "2026-02-30", "2025-02-29", "abc"]) {
      expect(() => parseDate(value, t)).toThrow("invalidDate");
    }
  });
});
