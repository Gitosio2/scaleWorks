import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { modelTitle } from "@/lib/model-title";
import { getPublicModels } from "@/lib/portfolio";
import { shareMetadata } from "@/lib/share-metadata";
import { GalleryFilters } from "@/components/gallery-filters";
import { FilterSelect } from "@/components/ui/list-filters";
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

const FILTERS = ["company", "brand", "type"] as const;

// Spelling variants ("Man" and "MAN") are one filter value: compared without case or edge spaces.
const norm = (v: string | null) => v?.trim().toLowerCase() ?? "";

/** The distinct values of a column as select options, the first spelling found as the label. */
function distinctOptions(values: (string | null)[], labelOf: (v: string) => string = (v) => v) {
  const byValue = new Map<string, string>();
  for (const v of values) if (v && !byValue.has(norm(v))) byValue.set(norm(v), labelOf(v.trim()));
  return [...byValue]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("portfolio");
  const ttype = await getTranslations("modelType");
  const all = await getPublicModels();

  const selected = Object.fromEntries(
    FILTERS.map((key) => [key, typeof sp[key] === "string" ? norm(sp[key] as string) : ""]),
  ) as Record<(typeof FILTERS)[number], string>;
  const rows = all.filter((m) => FILTERS.every((key) => !selected[key] || norm(m[key]) === selected[key]));
  const activeCount = FILTERS.filter((key) => selected[key]).length;

  // A filter is offered only when the gallery has more than one distinct value for it.
  const options = {
    company: distinctOptions(all.map((m) => m.company)),
    brand: distinctOptions(all.map((m) => m.brand)),
    type: distinctOptions(
      all.map((m) => m.type),
      (v) => ttype(v as Parameters<typeof ttype>[0]),
    ),
  };
  const offered = FILTERS.filter((key) => options[key].length > 1);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          all.length > 0 && (
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
      {offered.length > 0 && (
        <GalleryFilters action="/portfolio" clearLabel={t("clearFilters")} showClear={activeCount > 0}>
          {offered.map((key) => (
            <FilterSelect
              key={key}
              name={key}
              label={t(`filters.${key}`)}
              defaultValue={selected[key]}
              options={options[key]}
            />
          ))}
        </GalleryFilters>
      )}
      {rows.length === 0 ? (
        <p className="text-muted">{all.length === 0 ? t("empty") : t("noMatches")}</p>
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
