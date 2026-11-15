import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItemImages } from "@/db/schema";
import { storageConfigured } from "@/lib/storage";
import { PhotoUploader } from "@/components/photo-uploader";
import { SubmitButton } from "@/components/ui/submit-button";
import { CollapsibleCard } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Photo } from "@/components/ui/photo";
import { StatusBadge } from "@/components/ui/status-badge";
import { linkActionClass } from "@/components/ui/styles";
import { addCollectionImage, deleteCollectionImage, setCollectionCover } from "./image-actions";

// Private photos of a collection item: same layout as a model's, without publishing.
export async function CollectionPhotosSection({
  itemId,
  itemName,
  userId,
}: {
  itemId: string;
  itemName: string;
  userId: string;
}) {
  const t = await getTranslations("collection.photos");
  const images = await db
    .select({ id: collectionItemImages.id })
    .from(collectionItemImages)
    .where(and(eq(collectionItemImages.itemId, itemId), eq(collectionItemImages.userId, userId)))
    .orderBy(asc(collectionItemImages.position), asc(collectionItemImages.createdAt));
  const configured = storageConfigured();

  return (
    <CollapsibleCard title={t("title", { count: images.length })} defaultOpen={images.length > 0}>
      {!configured && <p className="text-sm text-warn">{t("notConfigured")}</p>}
      <PhotoUploader
        upload={addCollectionImage.bind(null, itemId)}
        disabled={!configured}
        namespace="collection.photos"
      />

      {images.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="flex flex-col gap-1.5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] border border-line bg-canvas">
                <Photo
                  src={`/img/collection/${image.id}/thumb`}
                  alt={t("alt", { n: index + 1, name: itemName })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {index === 0 ? (
                  <StatusBadge variant="info">{t("cover")}</StatusBadge>
                ) : (
                  <form action={setCollectionCover.bind(null, itemId, image.id)}>
                    <SubmitButton className={`${linkActionClass} min-h-9 text-[13px]`}>
                      {t("makeCover")}
                    </SubmitButton>
                  </form>
                )}
                <ConfirmDelete
                  label={t("delete")}
                  title={t("delete")}
                  message={t("deleteMessage")}
                  action={deleteCollectionImage.bind(null, itemId, image.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleCard>
  );
}
