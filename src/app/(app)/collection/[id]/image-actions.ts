"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItemImages, collectionItems } from "@/db/schema";
import { collectionImageKeys } from "@/lib/collection-image";
import { MAX_FULL_BYTES, MAX_THUMB_BYTES, readImage } from "@/lib/image-upload";
import { isUuid } from "@/lib/input";
import { requireUser } from "@/lib/session";
import { deleteObjects, putObject } from "@/lib/storage";

const MAX_IMAGES_PER_ITEM = 20;

// Every action checks the item belongs to the signed-in user (and the id is a uuid).
async function assertOwnsItem(itemId: string, userId: string) {
  const t = await getTranslations("actionErrors");
  if (!isUuid(itemId)) throw new Error(t("collectionNotFound"));
  const [owned] = await db
    .select({ id: collectionItems.id })
    .from(collectionItems)
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, userId)));
  if (!owned) throw new Error(t("collectionNotFound"));
}

function refresh(itemId: string) {
  revalidatePath(`/collection/${itemId}`);
  revalidatePath("/collection/list");
}

/** Adds one photo: a full-size version and a thumbnail, both made in the browser. */
export async function addCollectionImage(itemId: string, formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  await assertOwnsItem(itemId, user.id);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionItemImages)
    .where(and(eq(collectionItemImages.itemId, itemId), eq(collectionItemImages.userId, user.id)));
  if (count >= MAX_IMAGES_PER_ITEM) throw new Error(t("collectionImageLimit"));

  const full = await readImage(formData.get("full"), MAX_FULL_BYTES);
  const thumb = await readImage(formData.get("thumb"), MAX_THUMB_BYTES);

  const { key, thumbKey } = collectionImageKeys(
    user.id,
    itemId,
    crypto.randomUUID(),
    full.kind.ext,
    thumb.kind.ext,
  );
  await putObject(key, full.bytes, full.kind.contentType);
  try {
    await putObject(thumbKey, thumb.bytes, thumb.kind.contentType);
    await db.insert(collectionItemImages).values({
      itemId,
      userId: user.id,
      key,
      thumbKey,
      // Next free position, read in the same statement so two uploads at once
      // do not get the same one (the cover is the lowest position).
      position: sql`(
        select coalesce(max(${collectionItemImages.position}) + 1, 0)
        from ${collectionItemImages}
        where ${collectionItemImages.itemId} = ${itemId}
      )`,
    });
  } catch (error) {
    await deleteObjects([key, thumbKey]);
    throw error;
  }
  refresh(itemId);
}

export async function deleteCollectionImage(itemId: string, imageId: string) {
  const user = await requireUser();
  if (!isUuid(itemId) || !isUuid(imageId)) return;
  const [image] = await db
    .select()
    .from(collectionItemImages)
    .where(
      and(
        eq(collectionItemImages.id, imageId),
        eq(collectionItemImages.itemId, itemId),
        eq(collectionItemImages.userId, user.id),
      ),
    );
  if (!image) return;
  await db
    .delete(collectionItemImages)
    .where(and(eq(collectionItemImages.id, imageId), eq(collectionItemImages.userId, user.id)));
  await deleteObjects([image.key, image.thumbKey]);
  refresh(itemId);
}

/** The cover is the photo with the lowest position. */
export async function setCollectionCover(itemId: string, imageId: string) {
  const user = await requireUser();
  if (!isUuid(itemId) || !isUuid(imageId)) return;
  const [first] = await db
    .select({ position: collectionItemImages.position })
    .from(collectionItemImages)
    .where(and(eq(collectionItemImages.itemId, itemId), eq(collectionItemImages.userId, user.id)))
    .orderBy(asc(collectionItemImages.position))
    .limit(1);
  if (!first) return;
  await db
    .update(collectionItemImages)
    .set({ position: first.position - 1 })
    .where(
      and(
        eq(collectionItemImages.id, imageId),
        eq(collectionItemImages.itemId, itemId),
        eq(collectionItemImages.userId, user.id),
      ),
    );
  refresh(itemId);
}
