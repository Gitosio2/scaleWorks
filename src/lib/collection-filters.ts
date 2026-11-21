import { and, arrayContains, eq, ilike, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { collectionItems, modelTag, modelType } from "@/db/schema";
import { isCountryCode } from "./countries";
import { containsPattern, enumParam, textParam, type SearchParams } from "./list-filters";

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
  // Any tag, whatever the type: "mining" matches the mining bulldozers, excavators and loaders alike.
  tag: (typeof modelTag.enumValues)[number] | null;
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
    tag: enumParam(sp, "tag", modelTag.enumValues),
  };
}

export function activeFilterCount(filters: CollectionFilters) {
  return Object.values(filters).filter(Boolean).length;
}

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
    filters.tag ? arrayContains(collectionItems.tags, [filters.tag]) : undefined,
  ];
  return conditions.filter((c): c is SQL => c !== undefined);
}

export const collectionWhere = (userId: string, filters: CollectionFilters) =>
  and(eq(collectionItems.userId, userId), ...collectionFilterConditions(filters));

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
