import { getLocale, getTranslations } from "next-intl/server";
import { activeFilterCount, collectionFilterQuery, parseCollectionFilters } from "@/lib/collection-filters";
import type { SearchParams } from "@/lib/list-filters";
import { GALLERY_PAGE_SIZE } from "@/lib/pagination";
import { requireUser } from "@/lib/session";
import { CollectionFilters } from "@/components/collection-filters";
import { CreateModal } from "@/components/ui/create-modal";
import { LoadMoreList } from "@/components/ui/load-more-list";
import { PageHeader } from "@/components/ui/page-header";
import { createCollectionItem } from "../actions";
import { CollectionFields } from "../collection-fields";
import { GalleryCard } from "../gallery-card";
import { loadMoreCollection } from "../load-more-actions";
import { collectionTotals, galleryItems } from "../queries";

// Photo gallery of the collection (private): one card per item with its cover photo.
// The first batch is rendered here; "Show more" appends the next ones.
export default async function CollectionGalleryPage({
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
    galleryItems(user.id, filters, { offset: 0, limit: GALLERY_PAGE_SIZE }),
  ]);

  return (
    <>
      <PageHeader title={tn("collectionGallery")} subtitle={t("gallerySubtitle")} />
      <CreateModal label={t("add")} title={t("add")} action={createCollectionItem}>
        <CollectionFields />
      </CreateModal>

      <CollectionFilters action="/collection/gallery" userId={user.id} filters={filters} />

      {items.length === 0 ? (
        <p className="text-muted">{activeFilterCount(filters) > 0 ? t("emptyFiltered") : t("empty")}</p>
      ) : (
        // Other filters or another language start over (new key); items added, edited or
        // deleted re-fetch the appended batches in place (new refreshKey).
        <LoadMoreList
          key={`${locale}|${query}`}
          refreshKey={`${total}|${version}`}
          listClassName="grid grid-cols-2 gap-4 lg:grid-cols-3"
          initialCount={items.length}
          total={total}
          loadMore={loadMoreCollection.bind(null, "gallery", query)}
        >
          {items.map((item) => (
            <GalleryCard key={item.id} item={item} />
          ))}
        </LoadMoreList>
      )}
    </>
  );
}
