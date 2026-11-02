import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDuration,
  formatEuros,
  formatQuantity,
  parseDuration,
  parseEuros,
  parseQuantity,
  remainingCents,
  type ActionT,
} from "./labels";

// Echoes the key so tests assert on which error was raised, not on its wording.
const t: ActionT = (key) => key;

// Intl uses non-breaking spaces; compare with plain ones.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("remainingCents", () => {
  it("is null when the price is unknown, even with a deposit", () => {
    expect(remainingCents(null, null)).toBeNull();
    expect(remainingCents(null, 5000)).toBeNull();
  });

  it("treats a missing deposit as zero", () => {
    expect(remainingCents(12000, null)).toBe(12000);
  });

  it("subtracts the deposit from the price", () => {
    expect(remainingCents(12000, 5000)).toBe(7000);
  });

  it("is zero when the deposit covers the price", () => {
    expect(remainingCents(12000, 12000)).toBe(0);
  });

  it("keeps a free model at zero", () => {
    expect(remainingCents(0, null)).toBe(0);
  });
});

describe("formatEuros", () => {
  it("shows a dash for null but not for zero", () => {
    expect(formatEuros(null, "en")).toBe("—");
    expect(plain(formatEuros(0, "en"))).toBe("€0.00");
  });

  it("formats English with a leading symbol and a dot", () => {
    expect(plain(formatEuros(1250, "en"))).toBe("€12.50");
    expect(plain(formatEuros(123456, "en"))).toBe("€1,234.56");
  });

  it("formats Spanish with a comma and a trailing symbol", () => {
    expect(plain(formatEuros(1250, "es"))).toBe("12,50 €");
    expect(plain(formatEuros(1234567, "es"))).toBe("12.345,67 €");
  });

  it("keeps single cents", () => {
    expect(plain(formatEuros(5, "en"))).toBe("€0.05");
  });

  it("formats negative amounts", () => {
    expect(plain(formatEuros(-250, "en"))).toBe("-€2.50");
  });
});

describe("parseEuros", () => {
  it("accepts comma and dot decimals", () => {
    expect(parseEuros("12,50", t)).toBe(1250);
    expect(parseEuros("12.5", t)).toBe(1250);
  });

  it("returns null for empty input", () => {
    expect(parseEuros("", t)).toBeNull();
    expect(parseEuros("   ", t)).toBeNull();
  });

  it("accepts zero and whole numbers", () => {
    expect(parseEuros("0", t)).toBe(0);
    expect(parseEuros(" 7 ", t)).toBe(700);
  });

  it("rounds sub-cent input to the nearest cent", () => {
    expect(parseEuros("0.004", t)).toBe(0);
    expect(parseEuros("0.006", t)).toBe(1);
  });

  it("rejects negatives and garbage", () => {
    expect(() => parseEuros("-1", t)).toThrow("invalidPrice");
    expect(() => parseEuros("abc", t)).toThrow("invalidPrice");
    expect(() => parseEuros("Infinity", t)).toThrow("invalidPrice");
  });
});

describe("parseQuantity", () => {
  it("parses fractions, decimals and integers", () => {
    expect(parseQuantity("1/4", t)).toBe(0.25);
    expect(parseQuantity("3 / 8", t)).toBe(0.375);
    expect(parseQuantity("0,3", t)).toBe(0.3);
    expect(parseQuantity("2", t)).toBe(2);
  });

  it("returns null for empty input", () => {
    expect(parseQuantity(" ", t)).toBeNull();
  });

  it("rejects zero, negatives, huge values and zero denominators", () => {
    expect(() => parseQuantity("0", t)).toThrow("invalidQuantity");
    expect(() => parseQuantity("-1", t)).toThrow("invalidQuantity");
    expect(() => parseQuantity("101", t)).toThrow("invalidQuantity");
    expect(() => parseQuantity("1/0", t)).toThrow("invalidQuantity");
    expect(() => parseQuantity("x", t)).toThrow("invalidQuantity");
  });

  it("accepts the upper bound", () => {
    expect(parseQuantity("100", t)).toBe(100);
  });
});

describe("formatQuantity", () => {
  it.each([
    [0.25, "1/4"],
    [0.5, "1/2"],
    [0.75, "3/4"],
    [0.125, "1/8"],
    [0.0625, "1/16"],
    [1, "1"],
    [2, "2"],
    [1.5, "1 1/2"],
    [2.25, "2 1/4"],
  ])("formats %s as %s", (n, expected) => {
    expect(formatQuantity(n)).toBe(expected);
  });

  it("falls back to a trimmed decimal when no fraction fits", () => {
    expect(formatQuantity(0.3)).toBe("0.3");
    expect(formatQuantity(0.58)).toBe("0.58");
    expect(formatQuantity(1 / 3)).toBe("0.333");
  });

  it("round-trips fractions through parseQuantity", () => {
    for (const raw of ["1/4", "3/8", "1/2", "7/16"]) {
      expect(formatQuantity(parseQuantity(raw, t)!)).toBe(raw);
    }
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [59, "00:59"],
    [60, "01:00"],
    [90, "01:30"],
    [600, "10:00"],
    [6000, "100:00"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("parseDuration", () => {
  it("parses H:MM and HH:MM", () => {
    expect(parseDuration("1:30")).toBe(90);
    expect(parseDuration("01:30")).toBe(90);
    expect(parseDuration("00:00")).toBe(0);
    expect(parseDuration(" 12:05 ")).toBe(725);
  });

  it("rejects minutes above 59 and malformed input", () => {
    expect(parseDuration("1:60")).toBeNull();
    expect(parseDuration("1:5")).toBeNull();
    expect(parseDuration("100:00")).toBeNull();
    expect(parseDuration("90")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("a:bc")).toBeNull();
  });

  it("round-trips with formatDuration up to 99:59", () => {
    for (const minutes of [0, 1, 59, 60, 61, 725, 5999]) {
      expect(parseDuration(formatDuration(minutes))).toBe(minutes);
    }
  });
});

describe("formatDate", () => {
  it("shows a dash for null", () => {
    expect(formatDate(null, "en")).toBe("—");
  });

  it("formats a calendar date in each locale", () => {
    expect(formatDate("2026-03-05", "en")).toBe("Mar 5, 2026");
    expect(plain(formatDate("2026-03-05", "es"))).toBe("5 mar 2026");
  });

  it("does not shift the day across the year boundary", () => {
    expect(formatDate("2026-01-01", "en")).toBe("Jan 1, 2026");
    expect(formatDate("2025-12-31", "en")).toBe("Dec 31, 2025");
  });

  it("handles a leap day", () => {
    expect(formatDate("2028-02-29", "en")).toBe("Feb 29, 2028");
  });

  it("returns an unparseable value unchanged", () => {
    expect(formatDate("not-a-date", "en")).toBe("not-a-date");
  });
});
