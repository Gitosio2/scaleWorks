import { describe, expect, it } from "vitest";
import { adjustQuantity, parseStockQuantity, parseUsedQuantity } from "./stock";
import type { ActionT } from "./labels";

const t: ActionT = (key) => key;

describe("parseStockQuantity", () => {
  it("treats empty input as zero", () => {
    expect(parseStockQuantity("", t)).toBe(0);
    expect(parseStockQuantity("  ", t)).toBe(0);
  });

  it("parses whole numbers", () => {
    expect(parseStockQuantity("12", t)).toBe(12);
    expect(parseStockQuantity(" 0 ", t)).toBe(0);
  });

  it("rejects negatives, decimals and non-numbers", () => {
    for (const raw of ["-1", "1.5", "1,5", "abc", "1e3", "NaN"]) {
      expect(() => parseStockQuantity(raw, t)).toThrow("invalidStockQuantity");
    }
  });

  it("accepts exactly 1,000,000 and rejects 1,000,001", () => {
    expect(parseStockQuantity("1000000", t)).toBe(1_000_000);
    expect(() => parseStockQuantity("1000001", t)).toThrow("invalidStockQuantity");
  });

  it("rejects absurdly large values", () => {
    expect(() => parseStockQuantity("100000000", t)).toThrow("invalidStockQuantity");
  });
});

describe("adjustQuantity", () => {
  it("adds and subtracts", () => {
    expect(adjustQuantity(5, 1)).toBe(6);
    expect(adjustQuantity(5, -2)).toBe(3);
  });

  it("never goes below zero", () => {
    expect(adjustQuantity(0, -1)).toBe(0);
    expect(adjustQuantity(2, -10)).toBe(0);
  });
});

describe("parseUsedQuantity", () => {
  it("accepts positive whole numbers", () => {
    expect(parseUsedQuantity("1", t)).toBe(1);
    expect(parseUsedQuantity(" 25 ", t)).toBe(25);
  });

  it("rejects zero, empty, negative, decimal and non-numeric input", () => {
    for (const raw of ["", "0", "-2", "1.5", "abc"]) {
      expect(() => parseUsedQuantity(raw, t)).toThrow("invalidUsedQuantity");
    }
  });
});
