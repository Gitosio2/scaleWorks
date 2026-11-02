"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { models, parts, supplyStatus } from "@/db/schema";
import { parseEuros, type ActionT } from "@/lib/labels";
import { requireUser } from "@/lib/session";

type SupplyStatus = (typeof supplyStatus.enumValues)[number];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function parseStatus(value: string, t: ActionT): SupplyStatus {
  if (!(supplyStatus.enumValues as readonly string[]).includes(value)) {
    throw new Error(t("invalidStatus"));
  }
  return value as SupplyStatus;
}

// Only http(s) links: anything else (e.g. "javascript:") would be unsafe in an href.
function parseUrl(value: string | null, t: ActionT) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(t("invalidLink"));
  }
  return url.toString();
}

export async function addPart(modelId: string, formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");

  // The model must belong to the current user.
  const [owned] = await db
    .select({ id: models.id })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, user.id)));
  if (!owned) throw new Error(t("modelNotFound"));

  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));

  await db.insert(parts).values({
    userId: user.id,
    modelId,
    brand: text(formData, "brand"),
    reference: text(formData, "reference"),
    description,
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    store: text(formData, "store"),
    url: parseUrl(text(formData, "url"), t),
    status: parseStatus(String(formData.get("status")), t),
  });
  revalidatePath(`/models/${modelId}`);
}

export async function updatePart(
  modelId: string,
  partId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");

  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));

  await db
    .update(parts)
    .set({
      brand: text(formData, "brand"),
      reference: text(formData, "reference"),
      description,
      priceCents: parseEuros(String(formData.get("price") ?? ""), t),
      store: text(formData, "store"),
      url: parseUrl(text(formData, "url"), t),
    })
    .where(
      and(
        eq(parts.id, partId),
        eq(parts.modelId, modelId),
        eq(parts.userId, user.id),
      ),
    );
  revalidatePath(`/models/${modelId}`);
  // A corrected price changes the pending-expenses and dashboard totals.
  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function updatePartStatus(
  modelId: string,
  partId: string,
  status: string,
) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  await db
    .update(parts)
    // Back to "to order" means not bought, so it cannot stay marked as paid.
    .set({
      status: parseStatus(status, t),
      ...(status === "to_order" ? { paid: false } : {}),
    })
    .where(
      and(
        eq(parts.id, partId),
        eq(parts.modelId, modelId),
        eq(parts.userId, user.id),
      ),
    );
  revalidatePath(`/models/${modelId}`);
}

export async function deletePart(modelId: string, partId: string) {
  const user = await requireUser();
  await db
    .delete(parts)
    .where(
      and(
        eq(parts.id, partId),
        eq(parts.modelId, modelId),
        eq(parts.userId, user.id),
      ),
    );
  revalidatePath(`/models/${modelId}`);
}
