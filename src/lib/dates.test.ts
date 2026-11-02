import { describe, expect, it } from "vitest";
import { todayInMadrid } from "./dates";

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
