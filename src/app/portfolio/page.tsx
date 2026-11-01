import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { modelTitle } from "@/lib/model-title";
import { getPublicModels } from "@/lib/portfolio";
import { SITE_NAME } from "@/lib/site";
import { PageHeader } from "@/components/ui/page-header";
import { Photo } from "@/components/ui/photo";

export async function generateMetadata() {
  const t = await getTranslations("portfolio");
  return { title: `${t("title")} · ${SITE_NAME}` };
}

export default async function PortfolioPage() {
  const t = await getTranslations("portfolio");
  const ttype = await getTranslations("modelType");
  const rows = await getPublicModels();

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
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
                <span className="font-bold group-hover:text-brand">{modelTitle(m.brand, m.name)}</span>
                {(m.type || m.company) && (
                  <span className="-mt-1.5 text-[13px] text-muted">
                    {[m.type ? ttype(m.type) : null, m.company].filter(Boolean).join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
