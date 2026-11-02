import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { modelTitle } from "@/lib/model-title";
import { getPublicPhotos } from "@/lib/portfolio";
import { shareMetadata } from "@/lib/share-metadata";
import { PageHeader } from "@/components/ui/page-header";
import { PhotoViewer } from "@/components/photo-viewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portfolio");
  const [first] = await getPublicPhotos();
  return shareMetadata({
    title: t("allPhotos"),
    description: t("subtitle"),
    path: "/portfolio/photos",
    coverId: first?.id,
  });
}

export default async function AllPhotosPage() {
  const t = await getTranslations("portfolio");
  const rows = await getPublicPhotos();

  // Photo numbers restart for each model, like on the model's own page.
  const seen = new Map<string, number>();
  const photos = rows.map((row) => {
    const n = (seen.get(row.modelId) ?? 0) + 1;
    seen.set(row.modelId, n);
    const title = modelTitle(row.brand, row.name);
    return { id: row.id, alt: t("alt", { n, name: title }), caption: title };
  });

  return (
    <>
      <Link
        href="/portfolio"
        className="inline-flex min-h-11 items-center self-start font-semibold text-brand hover:text-brand-hover"
      >
        {t("back")}
      </Link>
      <PageHeader title={t("allPhotos")} subtitle={t("allPhotosSubtitle", { count: photos.length })} />
      {photos.length === 0 ? (
        <p className="text-muted">{t("noPhotos")}</p>
      ) : (
        <PhotoViewer
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          gridSize="thumb"
          photos={photos}
        />
      )}
    </>
  );
}
