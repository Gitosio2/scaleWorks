import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { restoreFilters, saveFilters } from "@/lib/saved-filters";

const isDev = process.env.NODE_ENV === "development";

// Strict, nonce-based Content Security Policy (see the Next.js CSP guide).
// - Scripts need the per-request nonce; 'strict-dynamic' lets those scripts load
//   the Next.js chunks, so no host allow-list is needed.
// - Inline style="" attributes are forbidden (style-src-attr 'none'); the app
//   has none, so keep it that way: use Tailwind classes or SVG attributes.
// - Development needs 'unsafe-eval' (React debugging), inline styles and a
//   WebSocket connect-src (HMR); upgrade-insecure-requests would break
//   plain-http localhost.
function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    // In development Next injects styles at runtime, so only enforce it in production.
    `style-src-attr ${isDev ? "'unsafe-inline'" : "'none'"}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // 'self' does not cover WebSocket schemes in every browser (e.g. Safari), and
    // the dev server hot-reloads over one.
    ...(isDev ? ["connect-src 'self' ws: wss:"] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // Optimistic check only (cookie presence). Real authorization must be
  // re-checked on the server wherever data is read or written.
  // Reachable without a session: the login page, the public gallery, the
  // photo route (which decides per image whether it may be seen) and the site
  // icons (browsers and link-preview crawlers fetch them anonymously). Anything
  // else sends a visitor without a session to the public gallery; the owner
  // signs in from /login.
  const { pathname } = request.nextUrl;
  const isOpen =
    pathname === "/login" ||
    pathname === "/portfolio" ||
    pathname.startsWith("/portfolio/") ||
    pathname.startsWith("/img/") ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/pwa-icon/");
  if (!isOpen && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/portfolio", request.url));
  }

  const restored = restoreFilters(request);
  if (restored) return restored;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  // The policy goes on the request too: Next.js reads the nonce from it and
  // applies it to its own scripts and styles while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  saveFilters(request, response);
  return response;
}

// The open pages are included so they get the policy too; the auth check above
// skips them. Auth API responses and static assets do not need the header.
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
