import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  collectionFilterConditions,
  collectionFilterOptions,
  parseCollectionFilters,
} from "./collection-filters";

describe("parseCollectionFilters", () => {
  it("reads nothing from an empty query", () => {
    const f = parseCollectionFilters({});
    expect(f).toEqual({ q: "", brand: "", manufacturer: "", type: null, country: null, tag: null });
    expect(activeFilterCount(f)).toBe(0);
  });

  it("normalises brand and manufacturer and trims the text", () => {
    const f = parseCollectionFilters({ brand: "  MAN ", manufacturer: "Herpa", q: " s-way " });
    expect(f.brand).toBe("man");
    expect(f.manufacturer).toBe("herpa");
    expect(f.q).toBe("s-way");
  });

  it("accepts any tag without a type, so mining works across types", () => {
    expect(parseCollectionFilters({ tag: "mining" }).tag).toBe("mining");
  });

  it("drops values that are not valid", () => {
    const f = parseCollectionFilters({ type: "spaceship", tag: "nope", country: "XX" });
    expect(f.type).toBeNull();
    expect(f.tag).toBeNull();
    expect(f.country).toBeNull();
  });

  it("accepts a country code in any case", () => {
    expect(parseCollectionFilters({ country: "pe" }).country).toBe("PE");
  });

  it("counts the active filters", () => {
    expect(activeFilterCount(parseCollectionFilters({ tag: "mining", q: "cat", country: "PE" }))).toBe(3);
  });
});

describe("collectionFilterConditions", () => {
  it("has one condition per active filter", () => {
    expect(collectionFilterConditions(parseCollectionFilters({}))).toHaveLength(0);
    const all = parseCollectionFilters({
      q: "a",
      brand: "b",
      manufacturer: "c",
      type: "dumper",
      country: "ES",
      tag: "mining",
    });
    expect(collectionFilterConditions(all)).toHaveLength(6);
  });
});

describe("collectionFilterOptions", () => {
  const labels = {
    locale: "es",
    type: (v: string) => v,
    tag: (v: string) => v,
    country: (c: string) => c,
  };
  const rows = [
    { brand: "Caterpillar", manufacturer: "Norscot", type: "bulldozer" as const, country: "PE", tags: ["mining" as const] },
    { brand: "CATERPILLAR ", manufacturer: "norscot", type: "excavator" as const, country: "PE", tags: ["mining" as const, "tracked" as const] },
    { brand: "Iveco", manufacturer: null, type: null, country: null, tags: [] },
  ];

  it("offers each tag once even when it appears under several types", () => {
    const { tag } = collectionFilterOptions(rows, labels);
    expect(tag.map((o) => o.value)).toEqual(["mining", "tracked"]);
  });

  it("merges spelling variants of brand and manufacturer", () => {
    const o = collectionFilterOptions(rows, labels);
    expect(o.brand).toEqual([
      { value: "caterpillar", label: "Caterpillar" },
      { value: "iveco", label: "Iveco" },
    ]);
    expect(o.manufacturer).toEqual([{ value: "norscot", label: "Norscot" }]);
  });

  it("offers only the types and countries in use", () => {
    const o = collectionFilterOptions(rows, labels);
    expect(o.type.map((t) => t.value)).toEqual(["bulldozer", "excavator"]);
    expect(o.country).toEqual([{ value: "PE", label: "PE" }]);
  });
});
