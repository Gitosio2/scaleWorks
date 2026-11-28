"use server";

import { MAX_FILTER_QUERY_LENGTH, parseCollectionFilters } from "@/lib/collection-filters";
import { GALLERY_PAGE_SIZE, PAGE_SIZE, parseLimit, parseOffset, searchParamsFromQuery } from "@/lib/pagination";
import { requireUser } from "@/lib/session";
import { GalleryCard } from "./gallery-card";
import { ListRow } from "./list-row";
import { galleryItems, listItems } from "./queries";

/**
 * Rows of the collection gallery or list for "Show more": `limit` rows (the
 * view's batch size by default; more to refresh every appended row at once)
 * from `offset` on, with the filters of `query` (`collectionFilterQuery`),
 * rendered on the server. Only the signed-in user's items are read, and only
 * the rendered rows are returned, never the database records.
 */
export async function loadMoreCollection(
  view: "gallery" | "list",
  query: string,
  offset: number,
  limit?: number,
) {
  const user = await requireUser();
  if (view !== "gallery" && view !== "list") throw new Error("Unknown collection view.");
  // A real page never sends more (see MAX_FILTER_QUERY_LENGTH); a longer one was tampered with.
  if (typeof query !== "string" || query.length > MAX_FILTER_QUERY_LENGTH) throw new Error("Invalid filters.");

  const filters = parseCollectionFilters(searchParamsFromQuery(query));
  const start = parseOffset(offset);

  if (view === "gallery") {
    const range = { offset: start, limit: parseLimit(limit, GALLERY_PAGE_SIZE) };
    const items = await galleryItems(user.id, filters, range);
    return { items: items.map((item) => <GalleryCard key={item.id} item={item} />), count: items.length };
  }
  const items = await listItems(user.id, filters, { offset: start, limit: parseLimit(limit, PAGE_SIZE) });
  return { items: items.map((item) => <ListRow key={item.id} item={item} />), count: items.length };
}
