import type { SearchParams } from "./list-filters";

export const PAGE_SIZE = 20;
// Photo grids are 2 columns on mobile and 3 on desktop: 24 fills both evenly.
export const GALLERY_PAGE_SIZE = 24;
export const PAGE_PARAM = "page";

// The 1-based page from a query param. Anything that is not a plain positive
// integer (missing, repeated, text, 0, negative, fractional, huge) is page 1.
export function parsePage(sp: SearchParams) {
  const raw = sp[PAGE_PARAM];
  if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) return 1;
  const page = Number(raw.trim());
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

// Which slice of `total` rows to show. The page is clamped to 1..totalPages so a
// stale link past the end shows the last page instead of an empty one. `from`
// and `to` are 1-based row numbers (both 0 when there are no rows).
export function pageWindow(page: number, total: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const offset = (current - 1) * pageSize;
  return {
    page: current,
    totalPages,
    offset,
    limit: pageSize,
    from: total === 0 ? 0 : offset + 1,
    to: Math.min(offset + pageSize, total),
  };
}

// Largest row offset a "show more" request may ask for. Far beyond any real
// collection, it only bounds what a tampered request can make the database skip.
export const MAX_OFFSET = 100_000;

// Row offset of a "show more" request. It comes from the client, so anything
// that is not a non-negative integer counts as the start and it is capped.
export function parseOffset(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return 0;
  return Math.min(value, MAX_OFFSET);
}

// Most rows one "show more" request may return. A list refreshes all the rows
// it appended in one request, so this is well above a batch, but it bounds what
// a tampered request can make the server read and render.
export const MAX_BATCH_LIMIT = 500;

// Row count of a "show more" request: a positive integer, capped, or `fallback`
// (the view's batch size) for anything else.
export function parseLimit(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return fallback;
  return Math.min(value, MAX_BATCH_LIMIT);
}

// The query string of a list without its page param (no leading "?"), e.g. to
// load more rows with the same filters.
export function listQuery(sp: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === PAGE_PARAM || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  return params.toString();
}

// The inverse of `listQuery`, shaped like Next's searchParams: a repeated key
// becomes an array, a single one a string.
export function searchParamsFromQuery(query: string): SearchParams {
  const values = new Map<string, string[]>();
  for (const [key, value] of new URLSearchParams(query)) {
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  // fromEntries defines own properties, so "__proto__" is a plain key here.
  return Object.fromEntries(
    [...values].map(([key, list]) => [key, list.length === 1 ? list[0] : list]),
  );
}

// Link to `page` of a list, keeping the current query params. Page 1 has no
// page param, so it is the same URL as the unpaginated list.
export function pageHref(pathname: string, sp: SearchParams, page: number) {
  const params = new URLSearchParams(listQuery(sp));
  if (page > 1) params.set(PAGE_PARAM, String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
