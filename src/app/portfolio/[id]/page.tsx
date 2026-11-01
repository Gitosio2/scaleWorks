import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { models, modelImages } from "@/db/schema";
import { portfolioOwnerId, UUID_PATTERN } from "@/lib/portfolio";
import { SITE_NAME } from "@/lib/site";
import { PageHeader } from "@/components/ui/page-header";
import { Photo } from "@/components/ui/photo";

// Public page: only these columns are ever read for a model.
async function findPublicModel(id: string) {
  const ownerId = await portfolioOwnerId();
  if (!ownerId || !UUID_PATTERN.test(id)) return null;
  const [model] = await db
    .select({ id: models.id, name: models.name, company: models.company })
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const model = await findPublicModel((await params).id);
  return { title: model ? `${model.name} · ${SITE_NAME}` : SITE_NAME };
}

export default async function PublicModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("portfolio");
  const model = await findPublicModel(id);
  if (!model) notFound();

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
      <PageHeader title={model.name} subtitle={model.company} />
      {images.length === 0 ? (
        <p className="text-muted">{t("noPhotos")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={image.id}>
              <a
                href={`/img/${image.id}/full`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-[4/3] overflow-hidden rounded-[14px] border border-line bg-canvas"
              >
                <Photo
                  src={`/img/${image.id}/full`}
                  alt={t("alt", { n: index + 1, name: model.name })}
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
