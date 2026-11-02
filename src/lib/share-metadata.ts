import { headers } from "next/headers";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { siteOrigin } from "@/lib/share";
import { SITE_NAME } from "@/lib/site";

const OG_LOCALES: Record<string, string> = { es: "es_ES", en: "en_US" };

/**
 * Open Graph and Twitter metadata for a public gallery page. Crawlers need
 * absolute URLs, so everything is resolved against the site origin (SITE_URL,
 * or the request host). The cover goes through /img/[id]/thumb, which only
 * serves photos of published, finished models of the gallery account.
 */
export async function shareMetadata(input: {
  title: string;
  description: string;
  path: string;
  coverId?: string | null;
}): Promise<Metadata> {
  const h = await headers();
  const origin = siteOrigin({
    configured: process.env.SITE_URL,
    host: h.get("x-forwarded-host") ?? h.get("host"),
    proto: h.get("x-forwarded-proto"),
  });
  const locale = await getLocale();
  const fullTitle = `${input.title} · ${SITE_NAME}`;
  // Without an origin the image URL cannot be absolute, so it is left out.
  const images = origin && input.coverId ? [{ url: `/img/${input.coverId}/thumb`, alt: input.title }] : undefined;

  return {
    ...(origin && { metadataBase: new URL(origin) }),
    title: fullTitle,
    description: input.description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: fullTitle,
      description: input.description,
      url: input.path,
      locale: OG_LOCALES[locale] ?? locale,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: fullTitle,
      description: input.description,
      images,
    },
  };
}
