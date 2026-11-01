import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const isDev = process.env.NODE_ENV === "development";

// Strict, nonce-based Content Security Policy (see the Next.js CSP guide).
// - Scripts need the per-request nonce; 'strict-dynamic' lets those scripts load
//   the Next.js chunks, so no host allow-list is needed.
// - Inline style="" attributes are forbidden (style-src-attr 'none'); the app
//   has none, so keep it that way: use Tailwind classes or SVG attributes.
// - Development needs 'unsafe-eval' (React debugging) and inline styles (HMR);
//   upgrade-insecure-requests would break plain-http localhost.
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
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // Optimistic check only (cookie presence). Real authorization must be
  // re-checked on the server wherever data is read or written.
  const isLogin = request.nextUrl.pathname === "/login";
  if (!isLogin && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  // The policy goes on the request too: Next.js reads the nonce from it and
  // applies it to its own scripts and styles while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// The login page is included so it gets the policy too; the auth check above
// skips it. Auth API responses and static assets do not need the header.
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
