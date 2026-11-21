import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  activeFilterCount,
  collectionFilterOptions,
  type CollectionFilters as Filters,
} from "@/lib/collection-filters";
import { countryName } from "@/lib/countries";
import { FilterChips, FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";

/**
 * Filter panel of the user's own collection, shared by the list and the gallery:
 * brand, manufacturer, type and country as selects and the tags as toggle chips
 * (offering only values the collection has; several tags can be on at once) and a
 * free text for the model or reference. `action` is the
 * page it filters; the page applies the same `filters` to its query.
 */
export async function CollectionFilters({
  action,
  userId,
  filters,
}: {
  action: string;
  userId: string;
  filters: Filters;
}) {
  const t = await getTranslations("collection");
  const ttype = await getTranslations("modelType");
  const ttag = await getTranslations("modelTag");
  const locale = await getLocale();

  const facets = await db
    .select({
      brand: collectionItems.brand,
      manufacturer: collectionItems.manufacturer,
      type: collectionItems.type,
      country: collectionItems.country,
      tags: collectionItems.tags,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));

  const options = collectionFilterOptions(facets, {
    locale,
    type: (v) => ttype(v),
    tag: (v) => ttag(v),
    country: (code) => countryName(code, locale),
  });

  // A tag from a bookmarked link stays visible (and can be switched off) even if the collection no longer has it.
  const tagOptions = [
    ...options.tag,
    ...filters.tags
      .filter((tag) => !options.tag.some((o) => o.value === tag))
      .map((tag) => ({ value: tag as string, label: ttag(tag) })),
  ];

  return (
    <ListFilters action={action} activeCount={activeFilterCount(filters)}>
      <FilterText
        name="q"
        label={t("searchLabel")}
        defaultValue={filters.q}
        placeholder={t("searchPlaceholder")}
      />
      <FilterSelect name="brand" label={t("brand")} defaultValue={filters.brand} options={options.brand} />
      <FilterSelect
        name="manufacturer"
        label={t("manufacturer")}
        defaultValue={filters.manufacturer}
        options={options.manufacturer}
      />
      <FilterSelect name="type" label={t("type")} defaultValue={filters.type ?? ""} options={options.type} />
      <FilterSelect
        name="country"
        label={t("country")}
        defaultValue={filters.country ?? ""}
        options={options.country}
      />
      <FilterChips name="tag" label={t("tags")} selected={filters.tags} options={tagOptions} />
    </ListFilters>
  );
}
