import { getLocale, getTranslations } from "next-intl/server";
import { activeFilterCount, collectionFilterQuery, parseCollectionFilters } from "@/lib/collection-filters";
import type { SearchParams } from "@/lib/list-filters";
import { PAGE_SIZE } from "@/lib/pagination";
import { requireUser } from "@/lib/session";
import { CollectionFilters } from "@/components/collection-filters";
import { Card } from "@/components/ui/card";
import { CreateModal } from "@/components/ui/create-modal";
import { LoadMoreList } from "@/components/ui/load-more-list";
import { PageHeader } from "@/components/ui/page-header";
import { cardClass, cx } from "@/components/ui/styles";
import { createCollectionItem } from "../actions";
import { CollectionFields } from "../collection-fields";
import { ListRow } from "../list-row";
import { loadMoreCollection } from "../load-more-actions";
import { collectionTotals, listItems } from "../queries";

// Text-only list of the collection (private for now).
// The first batch is rendered here; "Show more" appends the next ones.
export default async function CollectionListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("collection");
  const tn = await getTranslations("nav");
  const filters = parseCollectionFilters(sp);
  const locale = await getLocale();
  const query = collectionFilterQuery(filters);

  const [{ total, version }, items] = await Promise.all([
    collectionTotals(user.id, filters),
    listItems(user.id, filters, { offset: 0, limit: PAGE_SIZE }),
  ]);

  return (
    <>
      <PageHeader title={tn("collectionList")} subtitle={t("listSubtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createCollectionItem}>
        <CollectionFields />
      </CreateModal>

      <CollectionFilters action="/collection/list" userId={user.id} filters={filters} />

      {items.length === 0 ? (
        <Card className="py-0!">
          <ul className="flex flex-col">
            <li className="py-4 text-muted">{activeFilterCount(filters) > 0 ? t("emptyFiltered") : t("empty")}</li>
          </ul>
        </Card>
      ) : (
        // Same card as <Card className="py-0!">, with the button below it. Other filters or
        // another language start over (new key); items added, edited or deleted re-fetch
        // the appended batches in place (new refreshKey).
        <LoadMoreList
          key={`${locale}|${query}`}
          refreshKey={`${total}|${version}`}
          listWrapperClassName={cx(cardClass, "py-0!")}
          listClassName="flex flex-col"
          initialCount={items.length}
          total={total}
          loadMore={loadMoreCollection.bind(null, "list", query)}
        >
          {items.map((item) => (
            <ListRow key={item.id} item={item} />
          ))}
        </LoadMoreList>
      )}
    </>
  );
}
