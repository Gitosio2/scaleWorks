import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_FILTER_QUERY_LENGTH } from "@/lib/collection-filters";
import { GALLERY_PAGE_SIZE, MAX_BATCH_LIMIT, MAX_OFFSET, PAGE_SIZE } from "@/lib/pagination";
import { GalleryCard } from "./gallery-card";
import { ListRow } from "./list-row";
import { loadMoreCollection } from "./load-more-actions";
import { galleryItems, listItems } from "./queries";

vi.mock("@/lib/session", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("./queries", () => ({ galleryItems: vi.fn(), listItems: vi.fn() }));
vi.mock("./gallery-card", () => ({ GalleryCard: () => null }));
vi.mock("./list-row", () => ({ ListRow: () => null }));

const { requireUser } = await import("@/lib/session");

const noFilters = { q: "", brand: "", manufacturer: "", type: null, country: null, tags: [] };

beforeEach(() => {
  vi.mocked(galleryItems).mockReset().mockResolvedValue([
    { id: "a", brand: "Iveco", name: "S-way", coverId: null },
    { id: "b", brand: "MAN", name: "TGX", coverId: "img-1" },
  ]);
  vi.mocked(listItems).mockReset().mockResolvedValue([{ id: "c" }] as never);
  vi.mocked(requireUser).mockClear();
});

describe("loadMoreCollection", () => {
  it("renders the next gallery batch of the user's own items with the page filters", async () => {
    const result = await loadMoreCollection("gallery", "brand=MAN&tag=tipper&tag=tanker&page=4", 24);

    expect(galleryItems).toHaveBeenCalledWith(
      "user-1",
      { ...noFilters, brand: "man", tags: ["tipper", "tanker"] },
      { offset: 24, limit: GALLERY_PAGE_SIZE },
    );
    expect(result.count).toBe(2);
    const items = result.items as ReactElement<{ item: { id: string } }>[];
    expect(items.every((el) => isValidElement(el) && el.type === GalleryCard)).toBe(true);
    expect(items.map((el) => el.key)).toEqual(["a", "b"]);
    expect(items[1].props.item).toEqual({ id: "b", brand: "MAN", name: "TGX", coverId: "img-1" });
  });

  it("renders the next list batch as rows", async () => {
    const result = await loadMoreCollection("list", "", 20);

    expect(listItems).toHaveBeenCalledWith("user-1", noFilters, { offset: 20, limit: PAGE_SIZE });
    expect(galleryItems).not.toHaveBeenCalled();
    const items = result.items as ReactElement[];
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe(ListRow);
    expect(items[0].key).toBe("c");
    expect(result.count).toBe(1);
  });

  it("clamps a tampered offset", async () => {
    await loadMoreCollection("gallery", "", -5);
    await loadMoreCollection("gallery", "", 1.5);
    await loadMoreCollection("gallery", "", Number.MAX_SAFE_INTEGER);

    expect(vi.mocked(galleryItems).mock.calls.map((call) => call[2].offset)).toEqual([0, 0, MAX_OFFSET]);
  });

  it("reads a given number of rows, to refresh what was appended", async () => {
    await loadMoreCollection("list", "", 20, 60);

    expect(listItems).toHaveBeenCalledWith("user-1", noFilters, { offset: 20, limit: 60 });
  });

  it("caps the limit and uses the view's batch size for a missing or tampered one", async () => {
    await loadMoreCollection("gallery", "", 0, MAX_BATCH_LIMIT + 1);
    await loadMoreCollection("gallery", "", 0, 0);
    await loadMoreCollection("gallery", "", 0, -3);
    await loadMoreCollection("gallery", "", 0, 2.5);
    await loadMoreCollection("gallery", "", 0, "60" as never);
    await loadMoreCollection("gallery", "", 0, undefined);

    expect(vi.mocked(galleryItems).mock.calls.map((call) => call[2].limit)).toEqual([
      MAX_BATCH_LIMIT,
      GALLERY_PAGE_SIZE,
      GALLERY_PAGE_SIZE,
      GALLERY_PAGE_SIZE,
      GALLERY_PAGE_SIZE,
      GALLERY_PAGE_SIZE,
    ]);
  });

  it("accepts a query as long as the longest real filters", async () => {
    await loadMoreCollection("list", `q=${"x".repeat(MAX_FILTER_QUERY_LENGTH - 2)}`, 0);

    expect(vi.mocked(listItems).mock.calls[0][1].q).toHaveLength(100);
  });

  it("rejects an unknown view without querying", async () => {
    await expect(loadMoreCollection("table" as never, "", 0)).rejects.toThrow();
    expect(galleryItems).not.toHaveBeenCalled();
    expect(listItems).not.toHaveBeenCalled();
  });

  it("rejects a query that is not a short string", async () => {
    await expect(loadMoreCollection("list", "q=".padEnd(MAX_FILTER_QUERY_LENGTH + 1, "x"), 0)).rejects.toThrow();
    await expect(loadMoreCollection("list", 42 as never, 0)).rejects.toThrow();
    expect(listItems).not.toHaveBeenCalled();
  });

  it("checks the session before anything else", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

    await expect(loadMoreCollection("gallery", "", 0)).rejects.toThrow("NEXT_REDIRECT");
    expect(galleryItems).not.toHaveBeenCalled();
  });
});
