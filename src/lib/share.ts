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

export type SocialKey = "tiktok" | "instagram" | "facebook";

export type SocialLink = { key: SocialKey; href: string };

const SOCIAL_KEYS: SocialKey[] = ["tiktok", "instagram", "facebook"];

/**
 * Picks the configured social profile links, in a fixed order. Only https URLs
 * are accepted; empty or invalid values are skipped, so a typo hides the link
 * instead of rendering a broken or unsafe one.
 */
export function socialLinks(values: Partial<Record<SocialKey, string | null | undefined>>): SocialLink[] {
  const links: SocialLink[] = [];
  for (const key of SOCIAL_KEYS) {
    const raw = values[key]?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol === "https:") links.push({ key, href: url.href });
    } catch {
      // Invalid URL: leave this link out.
    }
  }
  return links;
}
