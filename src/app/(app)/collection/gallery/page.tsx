import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItemImages, collectionItems } from "@/db/schema";
import { activeFilterCount, collectionWhere, parseCollectionFilters } from "@/lib/collection-filters";
import type { SearchParams } from "@/lib/list-filters";
import { modelTitle } from "@/lib/model-title";
import { requireUser } from "@/lib/session";
import { CollectionFilters } from "@/components/collection-filters";
import { CreateModal } from "@/components/ui/create-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Photo } from "@/components/ui/photo";
import { createCollectionItem } from "../actions";
import { CollectionFields } from "../collection-fields";

// Photo gallery of the collection (private): one card per item with its cover photo.
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

  // The cover is the photo with the lowest position. The outer id is written out
  // because Drizzle drops table qualifiers inside sql``, so a bare "id" would
  // resolve to the subquery's own table.
  const items = await db
    .select({
      id: collectionItems.id,
      brand: collectionItems.brand,
      name: collectionItems.name,
      coverId: sql<string | null>`(
        select ${collectionItemImages.id} from ${collectionItemImages}
        where ${collectionItemImages.itemId} = ${sql.raw('"collection_items"."id"')}
        order by ${collectionItemImages.position}, ${collectionItemImages.createdAt}
        limit 1
      )`,
    })
    .from(collectionItems)
    .where(collectionWhere(user.id, filters))
    .orderBy(desc(collectionItems.createdAt));

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
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((item) => {
            const title = modelTitle(item.brand, item.name);
            return (
              <li key={item.id}>
                <Link href={`/collection/${item.id}`} className="group flex flex-col gap-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-line bg-canvas">
                    {item.coverId && (
                      <Photo
                        src={`/img/collection/${item.coverId}/thumb`}
                        alt={title}
                        className="transition-transform group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <span title={title} className="truncate px-3 text-sm font-bold group-hover:text-brand">
                    {title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
