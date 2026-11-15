import { describe, expect, it } from "vitest";
import { modelTag, modelType } from "@/db/schema";
import type { ActionT } from "./labels";
import { filterTagOptions, parseTags, TAGS_BY_TYPE, tagsForType } from "./tags";

const t: ActionT = (key) => key;

describe("TAGS_BY_TYPE", () => {
  it("only lists valid types and valid tags", () => {
    for (const [type, tags] of Object.entries(TAGS_BY_TYPE)) {
      expect(modelType.enumValues).toContain(type);
      for (const tag of tags) expect(modelTag.enumValues).toContain(tag);
    }
  });

  it("has no repeated tag within a type", () => {
    for (const tags of Object.values(TAGS_BY_TYPE)) {
      expect(new Set(tags).size).toBe(tags.length);
    }
  });

  it("uses every tag of the enum for at least one type", () => {
    const used = new Set(Object.values(TAGS_BY_TYPE).flat());
    for (const tag of modelTag.enumValues) expect(used.has(tag)).toBe(true);
  });
});

describe("tagsForType", () => {
  it("returns the allowed tags of a type", () => {
    expect(tagsForType("dumper")).toEqual(["articulated", "rigid", "site"]);
    expect(tagsForType("bulldozer")).toEqual(["mining", "civil_works"]);
    expect(tagsForType("truck")).toContain("tractor_unit");
    expect(tagsForType("crane")).toContain("heavy_lift");
  });

  it("returns none for types without tags and for no type", () => {
    expect(tagsForType("paver")).toEqual([]);
    expect(tagsForType("cargo")).toEqual([]);
    expect(tagsForType(null)).toEqual([]);
  });
});

describe("parseTags", () => {
  it("returns an empty list for no values", () => {
    expect(parseTags([], "truck", t)).toEqual([]);
    expect(parseTags([], null, t)).toEqual([]);
  });

  it("returns the tags in the canonical enum order, without duplicates", () => {
    expect(parseTags(["tipper", "rigid", "tipper", "articulated"], "truck", t)).toEqual([
      "rigid",
      "articulated",
      "tipper",
    ]);
  });

  it("rejects unknown tags", () => {
    expect(() => parseTags(["flying"], "truck", t)).toThrow("invalidTag");
    expect(() => parseTags([""], "truck", t)).toThrow("invalidTag");
  });

  it("rejects tags that are not allowed for the type", () => {
    expect(() => parseTags(["lattice"], "truck", t)).toThrow("invalidTag");
    expect(() => parseTags(["rigid", "lattice"], "truck", t)).toThrow("invalidTag");
    expect(() => parseTags(["rigid"], "crane", t)).toThrow("invalidTag");
    expect(() => parseTags(["mining"], "dumper", t)).toThrow("invalidTag");
  });

  it("rejects any tag without a type or for a type without tags", () => {
    expect(() => parseTags(["rigid"], null, t)).toThrow("invalidTag");
    expect(() => parseTags(["rigid"], "paver", t)).toThrow("invalidTag");
  });

  it("accepts tags shared by several types where allowed", () => {
    expect(parseTags(["rigid"], "dumper", t)).toEqual(["rigid"]);
    expect(parseTags(["mining"], "loader", t)).toEqual(["mining"]);
  });
});

describe("filterTagOptions", () => {
  it("offers every tag when no type filter is active", () => {
    expect(filterTagOptions(null)).toEqual([...modelTag.enumValues]);
  });

  it("offers only the tags of the filtered type, even an empty list", () => {
    expect(filterTagOptions("dumper")).toEqual(["articulated", "rigid", "site"]);
    expect(filterTagOptions("paver")).toEqual([]);
  });
});
