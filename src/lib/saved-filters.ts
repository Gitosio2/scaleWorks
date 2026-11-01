import { NextResponse, type NextRequest } from "next/server";
import { RESET_PARAM } from "./filter-reset";

// The list pages keep their filters in the URL. These helpers (run from the
// proxy) also remember them in a cookie, so opening the list again without
// filters - the sidebar link, or going back - brings the last ones back.
const FILTER_PAGES = ["/models", "/clients", "/quotes", "/expenses", "/consumables"];

const MAX_LENGTH = 500;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Next adds this to its own navigation requests; it is not a filter. (It is
// normally hidden from the proxy already; this is a safeguard.)
const FRAMEWORK_PARAMS = ["_rsc"];

const filtersCookieName = (pathname: string) => `filters_${pathname.slice(1)}`;

function filterParams(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.search);
  for (const key of FRAMEWORK_PARAMS) params.delete(key);
  return params;
}

function isListNavigation(request: NextRequest) {
  // Server actions are POSTs to the page URL; they must reach the page untouched.
  return request.method === "GET" && FILTER_PAGES.includes(request.nextUrl.pathname);
}

/** A redirect to apply before rendering, or null to carry on. */
export function restoreFilters(request: NextRequest) {
  if (!isListNavigation(request)) return null;
  const name = filtersCookieName(request.nextUrl.pathname);
  const params = filterParams(request);

  // The reset link of the filters panel: forget the saved filters and show the
  // list as it first opens. A plain link, so the whole page is loaded afresh.
  if (params.has(RESET_PARAM)) {
    const url = request.nextUrl.clone();
    url.search = "";
    const response = NextResponse.redirect(url);
    response.cookies.delete(name);
    return response;
  }
  if ([...params.keys()].length > 0) return null;

  const saved = request.cookies.get(name)?.value;
  if (!saved || saved.length > MAX_LENGTH) return null;
  // Re-serialised, so only well-formed key=value pairs can come back out.
  const query = new URLSearchParams(saved).toString();
  if (!query) return null;
  const url = request.nextUrl.clone();
  url.search = `?${query}`;
  return NextResponse.redirect(url);
}

/** Remembers the filters of a list page on the response that renders it. */
export function saveFilters(request: NextRequest, response: NextResponse) {
  if (!isListNavigation(request)) return;
  const query = filterParams(request).toString();
  if (!query || query.length > MAX_LENGTH) return;
  const name = filtersCookieName(request.nextUrl.pathname);
  if (request.cookies.get(name)?.value === query) return;
  response.cookies.set(name, query, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
}
