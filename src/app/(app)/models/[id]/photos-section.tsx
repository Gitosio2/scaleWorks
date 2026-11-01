import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { modelImages } from "@/db/schema";
import { storageConfigured } from "@/lib/storage";
import { CollapsibleCard } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Photo } from "@/components/ui/photo";
import { StatusBadge } from "@/components/ui/status-badge";
import { linkActionClass, secondaryButtonClass } from "@/components/ui/styles";
import { deleteModelImage, setCoverImage, setModelPublished } from "./image-actions";
import { PhotoUploader } from "./photo-uploader";

export async function PhotosSection({
  modelId,
  modelName,
  userId,
  published,
  finished,
}: {
  modelId: string;
  modelName: string;
  userId: string;
  published: boolean;
  finished: boolean;
}) {
  const t = await getTranslations("models.photos");
  const images = await db
    .select({ id: modelImages.id })
    .from(modelImages)
    .where(and(eq(modelImages.modelId, modelId), eq(modelImages.userId, userId)))
    .orderBy(asc(modelImages.position), asc(modelImages.createdAt));
  const configured = storageConfigured();

  return (
    <CollapsibleCard title={t("title", { count: images.length })} defaultOpen={images.length > 0}>
      {!configured && <p className="text-sm text-warn">{t("notConfigured")}</p>}
      <PhotoUploader modelId={modelId} disabled={!configured} />

      {images.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="flex flex-col gap-1.5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] border border-line bg-canvas">
                <Photo
                  src={`/img/${image.id}/thumb`}
                  alt={t("alt", { n: index + 1, name: modelName })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {index === 0 ? (
                  <StatusBadge variant="info">{t("cover")}</StatusBadge>
                ) : (
                  <form action={setCoverImage.bind(null, modelId, image.id)}>
                    <button type="submit" className={`${linkActionClass} min-h-9 text-[13px]`}>
                      {t("makeCover")}
                    </button>
                  </form>
                )}
                <ConfirmDelete
                  label={t("delete")}
                  title={t("delete")}
                  message={t("deleteMessage")}
                  action={deleteModelImage.bind(null, modelId, image.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
        <h3 className="text-[13px] font-semibold text-ink-2">{t("publicTitle")}</h3>
        <p className="text-[13px] text-muted">{t("publicInfo")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant={published ? "ok" : "mute"}>
            {published ? t("publicOn") : t("publicOff")}
          </StatusBadge>
          <form action={setModelPublished.bind(null, modelId, !published)}>
            <button type="submit" className={`${secondaryButtonClass} min-h-9 text-sm`}>
              {published ? t("unpublish") : t("publish")}
            </button>
          </form>
          {published && finished && (
            <Link href={`/portfolio/${modelId}`} className={`${linkActionClass} text-sm`}>
              {t("viewPublic")}
            </Link>
          )}
        </div>
        {published && !finished && (
          <p className="text-[13px] text-muted">{t("publicPending")}</p>
        )}
      </div>
    </CollapsibleCard>
  );
}
