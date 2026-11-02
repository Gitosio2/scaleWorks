/**
 * Pure helpers for the public gallery's link previews and contact button.
 * Kept free of Next and database imports so they can be unit tested.
 */

/**
 * The public origin used to build absolute URLs (crawlers need them). SITE_URL
 * wins when set; otherwise the origin is taken from the request headers, so a
 * deploy works without configuration. Returns null when neither is usable.
 */
export function siteOrigin(input: {
  configured?: string | null;
  host?: string | null;
  proto?: string | null;
}): string | null {
  const configured = input.configured?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // Fall through to the request headers.
    }
  }
  const host = input.host?.split(",")[0]?.trim();
  if (!host || /[\s/@]/.test(host)) return null;
  const proto = input.proto?.split(",")[0]?.trim().toLowerCase();
  const scheme = proto === "http" ? "http" : "https";
  try {
    return new URL(`${scheme}://${host}`).origin;
  } catch {
    return null;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns the PORTFOLIO_CONTACT setting into a link: an email becomes a mailto:,
 * a phone number a wa.me (WhatsApp) link, and an http(s) URL is used as is.
 * Anything else returns null, which hides the button.
 */
export function contactHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).href;
    } catch {
      return null;
    }
  }
  if (EMAIL_PATTERN.test(value)) return `mailto:${value}`;
  if (/^\+?[\d\s().-]+$/.test(value)) {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) return `https://wa.me/${digits}`;
  }
  return null;
}
