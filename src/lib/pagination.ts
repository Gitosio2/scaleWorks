import type { SearchParams } from "./list-filters";

export const PAGE_SIZE = 20;
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

// Link to `page` of a list, keeping the current query params. Page 1 has no
// page param, so it is the same URL as the unpaginated list.
export function pageHref(pathname: string, sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === PAGE_PARAM || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  if (page > 1) params.set(PAGE_PARAM, String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
