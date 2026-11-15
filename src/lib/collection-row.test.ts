import { describe, expect, it } from "vitest";
import { hasPurchasePrice, rowMeta } from "./collection-row";

const base = {
  manufacturer: null,
  company: null,
  country: null,
  year: null,
  purchasePriceCents: null,
};
const name = (code: string) => `name-${code}`;

describe("rowMeta", () => {
  it("lists manufacturer, company, country and year in that order", () => {
    expect(
      rowMeta({ ...base, manufacturer: "Herpa", company: "Transportes", country: "ES", year: 2021 }, name),
    ).toEqual([
      { kind: "text", text: "Herpa" },
      { kind: "text", text: "Transportes" },
      { kind: "country", code: "ES", name: "name-ES" },
      { kind: "text", text: "2021" },
    ]);
  });

  it("skips the empty ones", () => {
    expect(rowMeta({ ...base, company: "Transportes", year: 1999 }, name)).toEqual([
      { kind: "text", text: "Transportes" },
      { kind: "text", text: "1999" },
    ]);
    expect(rowMeta(base, name)).toEqual([]);
  });

  it("treats blank text as empty", () => {
    expect(rowMeta({ ...base, manufacturer: "  ", company: "" }, name)).toEqual([]);
  });
});

describe("hasPurchasePrice", () => {
  it("is true only when a price exists, zero included", () => {
    expect(hasPurchasePrice({ purchasePriceCents: 2500 })).toBe(true);
    expect(hasPurchasePrice({ purchasePriceCents: 0 })).toBe(true);
    expect(hasPurchasePrice({ purchasePriceCents: null })).toBe(false);
  });
});
