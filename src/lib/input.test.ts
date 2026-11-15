import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { capText, isUuid, parseHttpUrl, parseYear } from "./input";
import type { ActionT } from "./labels";

const t: ActionT = (key) => key;

describe("capText", () => {
  it("accepts text up to the limit", () => {
    expect(capText("a".repeat(500), 500, t)).toBe("a".repeat(500));
  });

  it("rejects text one character over the limit", () => {
    expect(() => capText("a".repeat(501), 500, t)).toThrow("textTooLong");
  });

  it("passes null through", () => {
    expect(capText(null, 500, t)).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts a v4 uuid in either case", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3F2B8C1E-9A4D-4E6F-8B7A-1C2D3E4F5A6B")).toBe(true);
  });

  it("rejects malformed ids", () => {
    for (const value of ["", "abc", "3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b", "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6bX", "' OR 1=1 --"]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

describe("parseHttpUrl", () => {
  it("returns null for empty input", () => {
    expect(parseHttpUrl(null, t)).toBeNull();
    expect(parseHttpUrl("", t)).toBeNull();
  });

  it("accepts http and https", () => {
    expect(parseHttpUrl("http://example.com/a", t)).toBe("http://example.com/a");
    expect(parseHttpUrl("https://example.com", t)).toBe("https://example.com/");
  });

  it("rejects other protocols and malformed values", () => {
    for (const value of ["javascript:alert(1)", "ftp://example.com", "not a url", "example.com"]) {
      expect(() => parseHttpUrl(value, t)).toThrow("invalidLink");
    }
  });
});

describe("parseYear", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("returns null for empty input", () => {
    expect(parseYear("", t, now)).toBeNull();
    expect(parseYear("   ", t, now)).toBeNull();
  });

  it("parses a plain integer year", () => {
    expect(parseYear("2021", t, now)).toBe(2021);
    expect(parseYear(" 1998 ", t, now)).toBe(1998);
  });

  it("accepts the range limits: 1800 up to next year", () => {
    expect(parseYear("1800", t, now)).toBe(1800);
    expect(parseYear("2027", t, now)).toBe(2027);
  });

  it("rejects years outside the range", () => {
    for (const value of ["1799", "2028", "0", "-2000", "99999"]) {
      expect(() => parseYear(value, t, now)).toThrow("invalidYear");
    }
  });

  it("rejects non-integers and non-numeric text", () => {
    for (const value of ["2021.5", "2021,5", "abc", "20x1", "1e3", "0x7E5"]) {
      expect(() => parseYear(value, t, now)).toThrow("invalidYear");
    }
  });

  // The server may run in any zone (Vercel runs in UTC): the year must not depend on it.
  describe("year boundary", () => {
    const originalTz = process.env.TZ;
    beforeEach(() => {
      process.env.TZ = "UTC";
    });
    afterEach(() => {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    });

    it("takes the current year from Madrid time at the new-year boundary", () => {
      // 23:30 UTC on 31 Dec is already 1 Jan in Madrid: next year is 2028.
      const madridNewYear = new Date("2026-12-31T23:30:00Z");
      expect(parseYear("2028", t, madridNewYear)).toBe(2028);
      expect(() => parseYear("2029", t, madridNewYear)).toThrow("invalidYear");
      const stillOldYear = new Date("2026-12-31T12:00:00Z");
      expect(parseYear("2027", t, stillOldYear)).toBe(2027);
      expect(() => parseYear("2028", t, stillOldYear)).toThrow("invalidYear");
    });
  });
});
