import { count, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionItemImages, collectionItems } from "@/db/schema";
import { collectionOrder, collectionWhere, type CollectionFilters } from "@/lib/collection-filters";

// Reads of the list and the gallery of the user's own collection. Every query is
// scoped to `userId`, so callers pass the id of the signed-in user only.

export type Range = { offset: number; limit: number };

// How many items match, plus a version of their data (the latest update), so a
// page can tell that rows it already showed may have changed.
export async function collectionTotals(userId: string, filters: CollectionFilters) {
  const [row] = await db
    .select({ total: count(), lastUpdate: max(collectionItems.updatedAt) })
    .from(collectionItems)
    .where(collectionWhere(userId, filters));
  return { total: row.total, version: row.lastUpdate?.toISOString() ?? "" };
}

// Cards of the gallery: the cover is the photo with the lowest position. The
// outer id is written out because Drizzle drops table qualifiers inside sql``,
// so a bare "id" would resolve to the subquery's own table.
export function galleryItems(userId: string, filters: CollectionFilters, { offset, limit }: Range) {
  return db
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
    .where(collectionWhere(userId, filters))
    .orderBy(...collectionOrder())
    .offset(offset)
    .limit(limit);
}

export type GalleryItem = Awaited<ReturnType<typeof galleryItems>>[number];

// Whole rows: the edit modal of each list row is prefilled from them.
export function listItems(userId: string, filters: CollectionFilters, { offset, limit }: Range) {
  return db
    .select()
    .from(collectionItems)
    .where(collectionWhere(userId, filters))
    .orderBy(...collectionOrder())
    .offset(offset)
    .limit(limit);
}
