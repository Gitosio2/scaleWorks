"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { modelImages, models } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { deleteObjects, putObject } from "@/lib/storage";

// The browser resizes before uploading (see photo-uploader.tsx); these caps
// are the server-side backstop, not the target size.
const MAX_FULL_BYTES = 1_500_000;
const MAX_THUMB_BYTES = 300_000;
const MAX_IMAGES_PER_MODEL = 20;

type ImageKind = { ext: "webp" | "jpg"; contentType: string };

// Trust the bytes, not the file name or the declared type.
function detectImage(bytes: Uint8Array): ImageKind | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", contentType: "image/webp" };
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  return null;
}

async function readImage(file: FormDataEntryValue | null, maxBytes: number) {
  const t = await getTranslations("actionErrors");
  if (!(file instanceof File) || file.size === 0) throw new Error(t("imageInvalid"));
  if (file.size > maxBytes) throw new Error(t("imageTooLarge"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImage(bytes);
  if (!kind) throw new Error(t("imageInvalid"));
  return { bytes, kind };
}

async function assertOwnsModel(modelId: string, userId: string) {
  const [owned] = await db
    .select({ id: models.id })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, userId)));
  if (!owned) {
    const t = await getTranslations("actionErrors");
    throw new Error(t("modelNotFound"));
  }
}

function refresh(modelId: string) {
  revalidatePath(`/models/${modelId}`);
  revalidatePath("/portfolio");
  revalidatePath(`/portfolio/${modelId}`);
}

/** Adds one photo: a full-size version and a thumbnail, both made in the browser. */
export async function addModelImage(modelId: string, formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  await assertOwnsModel(modelId, user.id);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(modelImages)
    .where(and(eq(modelImages.modelId, modelId), eq(modelImages.userId, user.id)));
  if (count >= MAX_IMAGES_PER_MODEL) throw new Error(t("imageLimit"));

  const full = await readImage(formData.get("full"), MAX_FULL_BYTES);
  const thumb = await readImage(formData.get("thumb"), MAX_THUMB_BYTES);

  const base = `models/${user.id}/${modelId}/${crypto.randomUUID()}`;
  const key = `${base}.${full.kind.ext}`;
  const thumbKey = `${base}-thumb.${thumb.kind.ext}`;
  await putObject(key, full.bytes, full.kind.contentType);
  try {
    await putObject(thumbKey, thumb.bytes, thumb.kind.contentType);
    // New photos go last; the first one uploaded is the cover until another is chosen.
    await db.insert(modelImages).values({
      modelId,
      userId: user.id,
      key,
      thumbKey,
      position: count,
    });
  } catch (error) {
    await deleteObjects([key, thumbKey]);
    throw error;
  }
  refresh(modelId);
}

export async function deleteModelImage(modelId: string, imageId: string) {
  const user = await requireUser();
  const [image] = await db
    .select()
    .from(modelImages)
    .where(
      and(
        eq(modelImages.id, imageId),
        eq(modelImages.modelId, modelId),
        eq(modelImages.userId, user.id),
      ),
    );
  if (!image) return;
  await db
    .delete(modelImages)
    .where(and(eq(modelImages.id, imageId), eq(modelImages.userId, user.id)));
  await deleteObjects([image.key, image.thumbKey]);
  refresh(modelId);
}

/** The cover is the photo with the lowest position. */
export async function setCoverImage(modelId: string, imageId: string) {
  const user = await requireUser();
  const [first] = await db
    .select({ position: modelImages.position })
    .from(modelImages)
    .where(and(eq(modelImages.modelId, modelId), eq(modelImages.userId, user.id)))
    .orderBy(asc(modelImages.position))
    .limit(1);
  if (!first) return;
  await db
    .update(modelImages)
    .set({ position: first.position - 1 })
    .where(
      and(
        eq(modelImages.id, imageId),
        eq(modelImages.modelId, modelId),
        eq(modelImages.userId, user.id),
      ),
    );
  refresh(modelId);
}

/** Opt a model in or out of the public gallery (it must also be finished to show). */
export async function setModelPublished(modelId: string, published: boolean) {
  const user = await requireUser();
  await db
    .update(models)
    .set({ published })
    .where(and(eq(models.id, modelId), eq(models.userId, user.id)));
  refresh(modelId);
}
