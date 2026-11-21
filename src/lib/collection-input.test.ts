import { describe, expect, it } from "vitest";
import { parseCollectionItem } from "./collection-input";
import type { ActionT } from "./labels";

const t: ActionT = (key) => key;
const now = new Date("2026-06-15T12:00:00Z");

function form(values: Record<string, string> = {}, tags: string[] = []) {
  const fd = new FormData();
  const base = { brand: "Iveco", name: "S-way", ...values };
  for (const [key, value] of Object.entries(base)) fd.set(key, value);
  for (const tag of tags) fd.append("tags", tag);
  return fd;
}

const parse = (values: Record<string, string> = {}, tags: string[] = []) =>
  parseCollectionItem(form(values, tags), t, now);

describe("parseCollectionItem", () => {
  it("builds a payload with defaults from the two required fields", () => {
    expect(parse()).toEqual({
      brand: "Iveco",
      name: "S-way",
      company: null,
      country: null,
      manufacturer: null,
      reference: null,
      type: null,
      tags: [],
      year: null,
      customized: false,
      gift: false,
      condition: "new",
      purchasePriceCents: null,
      purchaseDate: null,
      estimatedValueCents: null,
      estimatedValueAt: null,
      soldPriceCents: null,
      soldDate: null,
      notes: null,
    });
  });

  it("requires brand and name, trimmed", () => {
    expect(() => parse({ brand: "   " })).toThrow("brandRequired");
    expect(() => parse({ name: "" })).toThrow("nameRequired");
    expect(parse({ brand: "  Iveco  ", name: " S-way " })).toMatchObject({ brand: "Iveco", name: "S-way" });
  });

  it("trims optional text and turns empty into null", () => {
    const item = parse({ company: " Transportes ", manufacturer: " Herpa ", reference: " 311 ", notes: "  " });
    expect(item).toMatchObject({ company: "Transportes", manufacturer: "Herpa", reference: "311", notes: null });
  });

  it("rejects text over the length limits", () => {
    expect(() => parse({ company: "a".repeat(201) })).toThrow("textTooLong");
    expect(() => parse({ manufacturer: "a".repeat(201) })).toThrow("textTooLong");
    expect(() => parse({ reference: "a".repeat(201) })).toThrow("textTooLong");
    expect(() => parse({ notes: "a".repeat(5001) })).toThrow("notesTooLong");
    expect(parse({ notes: "a".repeat(5000) }).notes).toHaveLength(5000);
  });

  it("accepts a known uppercase country code or none", () => {
    expect(parse({ country: "ES" }).country).toBe("ES");
    expect(parse({ country: "" }).country).toBeNull();
    for (const value of ["es", "ZZ", "ESP"]) {
      expect(() => parse({ country: value })).toThrow("invalidCountry");
    }
  });

  it("accepts only known model types", () => {
    expect(parse({ type: "truck" }).type).toBe("truck");
    expect(parse({ type: "" }).type).toBeNull();
    expect(() => parse({ type: "boat" })).toThrow("invalidType");
  });

  it("parses the year with the shared year rules", () => {
    expect(parse({ year: "2021" }).year).toBe(2021);
    expect(parse({ year: "" }).year).toBeNull();
    expect(() => parse({ year: "1700" })).toThrow("invalidYear");
  });

  it("reads customized from a checkbox", () => {
    expect(parse({ customized: "on" }).customized).toBe(true);
    expect(parse().customized).toBe(false);
  });

  it("reads gift from a checkbox", () => {
    expect(parse({ gift: "on" }).gift).toBe(true);
    expect(parse().gift).toBe(false);
  });

  it("defaults the condition to new and rejects unknown ones", () => {
    expect(parse({ condition: "normal" }).condition).toBe("normal");
    expect(parse({ condition: "damaged" }).condition).toBe("damaged");
    expect(parse({ condition: "very_damaged" }).condition).toBe("very_damaged");
    expect(parse({ condition: "" }).condition).toBe("new");
    expect(() => parse({ condition: "broken" })).toThrow("invalidCondition");
  });

  it("parses prices as non-negative euros into cents", () => {
    const item = parse({ purchasePrice: "12,50", estimatedValue: "30", soldDate: "2026-02-01", soldPrice: "0" });
    expect(item).toMatchObject({ purchasePriceCents: 1250, estimatedValueCents: 3000, soldPriceCents: 0 });
    expect(() => parse({ purchasePrice: "-1" })).toThrow("invalidPrice");
    expect(() => parse({ estimatedValue: "abc" })).toThrow("invalidPrice");
  });

  it("parses the purchase and sold dates", () => {
    const item = parse({ purchaseDate: "2026-01-10", soldDate: "2026-03-05" });
    expect(item).toMatchObject({ purchaseDate: "2026-01-10", soldDate: "2026-03-05" });
    expect(() => parse({ purchaseDate: "10/01/2026" })).toThrow("invalidDate");
    expect(() => parse({ soldDate: "2026-02-30" })).toThrow("invalidDate");
  });

  it("does not allow selling before buying, but allows the same day", () => {
    expect(() => parse({ purchaseDate: "2026-03-05", soldDate: "2026-03-04" })).toThrow("soldBeforePurchase");
    expect(parse({ purchaseDate: "2026-03-05", soldDate: "2026-03-05" }).soldDate).toBe("2026-03-05");
    expect(parse({ soldDate: "2026-03-04" }).soldDate).toBe("2026-03-04");
  });

  it("requires a sold date when there is a sold price", () => {
    expect(() => parse({ soldPrice: "50" })).toThrow("soldPriceNeedsDate");
    expect(parse({ soldDate: "2026-03-04" }).soldPriceCents).toBeNull();
  });

  it("stamps the estimated value time only when a value is given", () => {
    expect(parse({ estimatedValue: "30" }).estimatedValueAt).toEqual(now);
    expect(parse({ estimatedValue: "0" }).estimatedValueAt).toEqual(now);
    expect(parse().estimatedValueAt).toBeNull();
  });

  it("parses the tags allowed for the type, in canonical order", () => {
    expect(parse({ type: "truck" }, ["tipper", "rigid"]).tags).toEqual(["rigid", "tipper"]);
    expect(parse({ type: "truck" }).tags).toEqual([]);
  });

  it("rejects tags that do not fit the type, or that come without one", () => {
    expect(() => parse({ type: "truck" }, ["lattice"])).toThrow("invalidTag");
    expect(() => parse({}, ["rigid"])).toThrow("invalidTag");
    expect(() => parse({ type: "paver" }, ["rigid"])).toThrow("invalidTag");
  });

  it("strips NUL characters from every text field, which Postgres text rejects", () => {
    const nul = String.fromCharCode(0);
    const item = parse({
      brand: `Iv${nul}eco`,
      name: `S${nul}-way`,
      company: `Trans${nul}portes`,
      manufacturer: `He${nul}rpa`,
      reference: `31${nul}1`,
      notes: `no${nul}tes`,
    });
    expect(item).toMatchObject({
      brand: "Iveco",
      name: "S-way",
      company: "Transportes",
      manufacturer: "Herpa",
      reference: "311",
      notes: "notes",
    });
  });

  it("treats a field made only of NUL characters as empty", () => {
    const nul = String.fromCharCode(0);
    expect(() => parse({ brand: nul + nul })).toThrow("brandRequired");
    expect(parse({ company: nul }).company).toBeNull();
  });
});
