import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  collectionOrder,
  collectionFilterConditions,
  collectionFilterOptions,
  parseCollectionFilters,
} from "./collection-filters";

describe("parseCollectionFilters", () => {
  it("reads nothing from an empty query", () => {
    const f = parseCollectionFilters({});
    expect(f).toEqual({ q: "", brand: "", manufacturer: "", type: null, country: null, tags: [] });
    expect(activeFilterCount(f)).toBe(0);
  });

  it("normalises brand and manufacturer and trims the text", () => {
    const f = parseCollectionFilters({ brand: "  MAN ", manufacturer: "Herpa", q: " s-way " });
    expect(f.brand).toBe("man");
    expect(f.manufacturer).toBe("herpa");
    expect(f.q).toBe("s-way");
  });

  it("accepts any tag without a type, so mining works across types", () => {
    expect(parseCollectionFilters({ tag: "mining" }).tags).toEqual(["mining"]);
  });

  it("reads several tags from repeated params, in the enum's order", () => {
    expect(parseCollectionFilters({ tag: ["mining", "tracked"] }).tags).toEqual(["tracked", "mining"]);
  });

  it("drops values that are not valid", () => {
    const f = parseCollectionFilters({ type: "spaceship", tag: "nope", country: "XX" });
    expect(f.type).toBeNull();
    expect(f.tags).toEqual([]);
    expect(f.country).toBeNull();
  });

  it("keeps the valid tags when others are invalid or repeated", () => {
    expect(parseCollectionFilters({ tag: ["mining", "nope", "mining"] }).tags).toEqual(["mining"]);
  });

  it("accepts a country code in any case", () => {
    expect(parseCollectionFilters({ country: "pe" }).country).toBe("PE");
  });

  it("counts the active filters", () => {
    expect(activeFilterCount(parseCollectionFilters({ tag: "mining", q: "cat", country: "PE" }))).toBe(3);
  });

  it("counts the tags as one filter however many are chosen", () => {
    expect(activeFilterCount(parseCollectionFilters({ tag: ["mining", "tracked"] }))).toBe(1);
    expect(activeFilterCount(parseCollectionFilters({ tag: ["nope"] }))).toBe(0);
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
      tag: ["mining", "tracked"],
    });
    expect(collectionFilterConditions(all)).toHaveLength(6);
  });

  describe("tags", () => {
    const dialect = new PgDialect();
    const tagsQuery = (sp: Parameters<typeof parseCollectionFilters>[0]) => {
      const [condition] = collectionFilterConditions(parseCollectionFilters(sp));
      return condition ? dialect.sqlToQuery(condition) : null;
    };

    it("adds no condition when no tag is chosen", () => {
      expect(tagsQuery({})).toBeNull();
      expect(tagsQuery({ tag: "nope" })).toBeNull();
    });

    it("matches the items that have ALL the chosen tags (array contains)", () => {
      const query = tagsQuery({ tag: ["mining", "tracked"] });
      expect(query?.sql).toBe('"collection_items"."tags" @> $1');
      expect(query?.params).toEqual(['{"tracked","mining"}']);
    });

    it("still filters by a single tag from an old link", () => {
      const query = tagsQuery({ tag: "mining" });
      expect(query?.sql).toBe('"collection_items"."tags" @> $1');
      expect(query?.params).toEqual(['{"mining"}']);
    });
  });
});

describe("collectionOrder", () => {
  const dialect = new PgDialect();

  it("sorts by brand, then model, then id, ignoring case and edge spaces", () => {
    const clauses = collectionOrder().map((c) => dialect.sqlToQuery(c).sql);
    expect(clauses).toEqual([
      'lower(trim("collection_items"."brand")) asc',
      'lower(trim("collection_items"."name")) asc',
      '"collection_items"."id" asc',
    ]);
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
