import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { modelTitle } from "@/lib/model-title";
import { getPublicModels } from "@/lib/portfolio";
import { shareMetadata } from "@/lib/share-metadata";
import { PageHeader } from "@/components/ui/page-header";
import { Photo } from "@/components/ui/photo";
import { cx, primaryButtonClass } from "@/components/ui/styles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portfolio");
  const [first] = await getPublicModels();
  return shareMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/portfolio",
    coverId: first?.coverId,
  });
}

// Brand, model and company on one line, like the card caption.
const label = (m: { brand: string | null; name: string; company: string | null }) =>
  [modelTitle(m.brand, m.name), m.company].filter(Boolean).join(" · ");

export default async function PortfolioPage() {
  const t = await getTranslations("portfolio");
  const rows = await getPublicModels();

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          rows.length > 0 && (
            <Link href="/portfolio/photos" className={cx(primaryButtonClass, "gap-2 shadow-sm")}>
              <svg
                aria-hidden
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.5" />
                <path d="m21 16-5-5-8 8" />
              </svg>
              {t("viewAllPhotos")}
            </Link>
          )
        }
      />
      {rows.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {rows.map((m) => (
            <li key={m.id}>
              <Link href={`/portfolio/${m.id}`} className="group flex flex-col gap-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-line bg-canvas">
                  {m.coverId && (
                    <Photo
                      src={`/img/${m.coverId}/thumb`}
                      alt={modelTitle(m.brand, m.name)}
                      className="transition-transform group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <span title={label(m)} className="truncate px-3 text-sm font-bold group-hover:text-brand">
                  {label(m)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
