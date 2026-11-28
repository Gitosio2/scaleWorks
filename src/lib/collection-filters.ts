import { and, arrayContains, asc, eq, ilike, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { collectionItems, modelTag, modelType } from "@/db/schema";
import { isCountryCode } from "./countries";
import { containsPattern, enumParam, enumParams, textParam, type SearchParams } from "./list-filters";

// Filters shared by the list and the gallery of the user's own collection.
// Brand and manufacturer are compared without case or edge spaces ("Man" and
// "MAN" are one value), so their values are stored already normalised.
export type CollectionFilters = {
  // Free text, looked up in the model name and the reference.
  q: string;
  brand: string;
  manufacturer: string;
  type: (typeof modelType.enumValues)[number] | null;
  country: string | null;
  // Any tags, whatever the type: "mining" matches the mining bulldozers, excavators and loaders alike.
  // Several can be chosen (repeated `tag` params); none means no tag filtering.
  tags: (typeof modelTag.enumValues)[number][];
};

const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

export function parseCollectionFilters(sp: SearchParams): CollectionFilters {
  const country = textParam(sp, "country").toUpperCase();
  return {
    q: textParam(sp, "q"),
    brand: norm(textParam(sp, "brand")),
    manufacturer: norm(textParam(sp, "manufacturer")),
    type: enumParam(sp, "type", modelType.enumValues),
    country: isCountryCode(country) ? country : null,
    tags: enumParams(sp, "tag", modelTag.enumValues),
  };
}

// Link to the collection list with the given filters applied, the inverse of
// parseCollectionFilters. Values go in the URL-encoded query; empty ones are left out.
export function collectionListHref(
  filters: Partial<{
    brand: string;
    manufacturer: string;
    type: string | null;
    country: string | null;
    tags: readonly string[];
  }>,
) {
  const query = new URLSearchParams();
  if (filters.brand) query.set("brand", filters.brand);
  if (filters.manufacturer) query.set("manufacturer", filters.manufacturer);
  if (filters.type) query.set("type", filters.type);
  if (filters.country) query.set("country", filters.country);
  for (const tag of filters.tags ?? []) query.append("tag", tag);
  const qs = query.toString();
  return qs ? `/collection/list?${qs}` : "/collection/list";
}

// The filters as a query string (no leading "?"), in a fixed order and without
// anything else the URL had (page, unknown params). "Show more" sends it to the
// server, which reads it back with `parseCollectionFilters`.
export function collectionFilterQuery(filters: CollectionFilters) {
  const params = new URLSearchParams();
  for (const key of ["q", "brand", "manufacturer", "type", "country"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  for (const tag of filters.tags) params.append("tag", tag);
  return params.toString();
}

// Longest query string `collectionFilterQuery` can produce, with room to spare:
// the three text filters keep at most 100 characters each (`textParam`), at most
// 9 encoded characters apiece (3 UTF-8 bytes as %XX), so about 2,700; type,
// country and every tag at once add about 400. Real queries are far shorter;
// the cap only stops a tampered "show more" call from making the server parse
// an arbitrarily long string. A test checks the worst case fits.
export const MAX_FILTER_QUERY_LENGTH = 4096;

// One per filter in use; the tags are a single filter however many are chosen.
export function activeFilterCount({ tags, ...single }: CollectionFilters) {
  return Object.values(single).filter(Boolean).length + (tags.length > 0 ? 1 : 0);
}

// The one place that decides how several chosen tags combine. Now an item must
// have ALL of them (array contains, `@>`); to match ANY of them instead, swap
// `arrayContains` for `arrayOverlaps` (`&&`), imported from drizzle-orm.
const tagsCondition = (tags: CollectionFilters["tags"]) =>
  tags.length > 0 ? arrayContains(collectionItems.tags, tags) : undefined;

const normalisedColumn = (column: SQLWrapper) => sql`lower(trim(${column}))`;

// WHERE conditions for the filters (the owner's own condition is not included).
export function collectionFilterConditions(filters: CollectionFilters): SQL[] {
  const conditions: Array<SQL | undefined> = [
    filters.q
      ? or(
          ilike(collectionItems.name, containsPattern(filters.q)),
          ilike(collectionItems.reference, containsPattern(filters.q)),
        )
      : undefined,
    filters.brand ? sql`${normalisedColumn(collectionItems.brand)} = ${filters.brand}` : undefined,
    filters.manufacturer
      ? sql`${normalisedColumn(collectionItems.manufacturer)} = ${filters.manufacturer}`
      : undefined,
    filters.type ? eq(collectionItems.type, filters.type) : undefined,
    filters.country ? eq(collectionItems.country, filters.country) : undefined,
    tagsCondition(filters.tags),
  ];
  return conditions.filter((c): c is SQL => c !== undefined);
}

export const collectionWhere = (userId: string, filters: CollectionFilters) =>
  and(eq(collectionItems.userId, userId), ...collectionFilterConditions(filters));

// Default order of the list and the gallery: brand, then model, ignoring case
// and edge spaces like the filters do. The id is the final tiebreaker so equal
// brand and model always come out in the same order.
export const collectionOrder = () => [
  asc(normalisedColumn(collectionItems.brand)),
  asc(normalisedColumn(collectionItems.name)),
  asc(collectionItems.id),
];

type FacetRow = {
  brand: string;
  manufacturer: string | null;
  type: (typeof modelType.enumValues)[number] | null;
  country: string | null;
  tags: readonly (typeof modelTag.enumValues)[number][];
};

// Distinct values of a text column as select options: one per normalised
// spelling, labelled with the first spelling found, sorted by label.
function textOptions(values: ReadonlyArray<string | null>, locale: string) {
  const byValue = new Map<string, string>();
  for (const value of values) {
    const key = norm(value);
    if (key && !byValue.has(key)) byValue.set(key, value!.trim());
  }
  return [...byValue]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

// Only values the collection actually has are offered. Tags come out once each
// (in the enum's order) however many types they appear under.
export function collectionFilterOptions(
  rows: readonly FacetRow[],
  labels: {
    locale: string;
    type: (value: FacetRow["type"] & string) => string;
    tag: (value: FacetRow["tags"][number]) => string;
    country: (code: string) => string;
  },
) {
  const { locale } = labels;
  const types = new Set(rows.map((r) => r.type));
  const tags = new Set(rows.flatMap((r) => r.tags));
  const countries = new Set(rows.map((r) => r.country));
  return {
    brand: textOptions(rows.map((r) => r.brand), locale),
    manufacturer: textOptions(rows.map((r) => r.manufacturer), locale),
    type: modelType.enumValues
      .filter((v) => types.has(v))
      .map((v) => ({ value: v as string, label: labels.type(v) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
    country: [...countries]
      .filter((c): c is string => !!c)
      .map((c) => ({ value: c, label: labels.country(c) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
    tag: modelTag.enumValues
      .filter((v) => tags.has(v))
      .map((v) => ({ value: v as string, label: labels.tag(v) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
  };
}
