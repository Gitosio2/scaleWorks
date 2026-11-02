import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { models, modelImages } from "@/db/schema";
import { modelTitle } from "@/lib/model-title";
import { portfolioOwnerId, UUID_PATTERN } from "@/lib/portfolio";
import { shareMetadata } from "@/lib/share-metadata";
import { SITE_NAME } from "@/lib/site";
import { PageHeader } from "@/components/ui/page-header";
import { PhotoViewer } from "@/components/photo-viewer";

// Public page: only these columns are ever read for a model.
async function findPublicModel(id: string) {
  const ownerId = await portfolioOwnerId();
  if (!ownerId || !UUID_PATTERN.test(id)) return null;
  const [model] = await db
    .select({
      id: models.id,
      brand: models.brand,
      name: models.name,
      type: models.type,
      company: models.company,
    })
    .from(models)
    .where(
      and(
        eq(models.id, id),
        eq(models.userId, ownerId),
        eq(models.published, true),
        eq(models.phase, "finished"),
      ),
    );
  return model ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const model = await findPublicModel(id);
  if (!model) return { title: SITE_NAME };
  const [t, ttype] = await Promise.all([getTranslations("portfolio"), getTranslations("modelType")]);
  const [cover] = await db
    .select({ id: modelImages.id })
    .from(modelImages)
    .where(eq(modelImages.modelId, model.id))
    .orderBy(asc(modelImages.position), asc(modelImages.createdAt))
    .limit(1);
  const details = [model.type ? ttype(model.type) : null, model.company].filter(Boolean).join(" · ");
  return shareMetadata({
    title: modelTitle(model.brand, model.name),
    description: details || t("subtitle"),
    path: `/portfolio/${model.id}`,
    coverId: cover?.id,
  });
}

export default async function PublicModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("portfolio");
  const ttype = await getTranslations("modelType");
  const model = await findPublicModel(id);
  if (!model) notFound();
  const title = modelTitle(model.brand, model.name);

  const images = await db
    .select({ id: modelImages.id })
    .from(modelImages)
    .where(eq(modelImages.modelId, model.id))
    .orderBy(asc(modelImages.position), asc(modelImages.createdAt));

  return (
    <>
      <Link
        href="/portfolio"
        className="inline-flex min-h-11 items-center self-start font-semibold text-brand hover:text-brand-hover"
      >
        {t("back")}
      </Link>
      <PageHeader
        title={title}
        subtitle={[model.type ? ttype(model.type) : null, model.company].filter(Boolean).join(" · ")}
      />
      {images.length === 0 ? (
        <p className="text-muted">{t("noPhotos")}</p>
      ) : (
        <PhotoViewer
          className="grid gap-4 sm:grid-cols-2"
          photos={images.map((image, index) => ({
            id: image.id,
            alt: t("alt", { n: index + 1, name: title }),
          }))}
        />
      )}
    </>
  );
}
