"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItemImages, collectionItems } from "@/db/schema";
import { nextEstimatedValueAt } from "@/lib/collection";
import { parseCollectionItem } from "@/lib/collection-input";
import { isUuid } from "@/lib/input";
import { requireUser } from "@/lib/session";
import { deleteObjects } from "@/lib/storage";

function refresh(id?: string) {
  if (id) revalidatePath(`/collection/${id}`);
  revalidatePath("/collection/list");
  revalidatePath("/collection/gallery");
}

export async function createCollectionItem(formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  const values = parseCollectionItem(formData, t, new Date());
  await db.insert(collectionItems).values({ ...values, userId: user.id });
  refresh();
}

export async function updateCollectionItem(id: string, formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  if (!isUuid(id)) throw new Error(t("collectionNotFound"));
  const [current] = await db
    .select({
      estimatedValueCents: collectionItems.estimatedValueCents,
      estimatedValueAt: collectionItems.estimatedValueAt,
    })
    .from(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, user.id)));
  if (!current) throw new Error(t("collectionNotFound"));

  const now = new Date();
  const values = parseCollectionItem(formData, t, now);
  await db
    .update(collectionItems)
    .set({
      ...values,
      // Only a new or changed estimate moves the "as of" date.
      estimatedValueAt: nextEstimatedValueAt(
        current.estimatedValueCents,
        current.estimatedValueAt,
        values.estimatedValueCents,
        now,
      ),
    })
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, user.id)));
  refresh(id);
}

export async function deleteCollectionItem(id: string) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  if (!isUuid(id)) throw new Error(t("collectionNotFound"));
  // Deleting the item cascades to its image rows but not to the stored files,
  // so read their keys first and remove the files afterwards.
  const images = await db
    .select({ key: collectionItemImages.key, thumbKey: collectionItemImages.thumbKey })
    .from(collectionItemImages)
    .where(and(eq(collectionItemImages.itemId, id), eq(collectionItemImages.userId, user.id)));
  await db
    .delete(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, user.id)));
  // The item is already gone, so a storage failure must not fail the action or
  // skip the redirect: log the keys so the files can be removed by hand.
  const keys = images.flatMap((i) => [i.key, i.thumbKey]);
  try {
    await deleteObjects(keys);
  } catch (error) {
    console.error("Stored photos of a deleted collection item could not be removed:", keys, error);
  }
  refresh();
  redirect("/collection/list");
}
