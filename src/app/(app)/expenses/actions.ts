"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { parts } from "@/db/schema";
import { parseEuros, type ActionT } from "@/lib/labels";
import { requireUser } from "@/lib/session";

// A loose expense is a part with no model and no quote. It only makes sense once
// bought, so it can be ordered or in hand ("to order" would never show as owed).
const LOOSE_STATUSES = ["ordered", "in_hand"] as const;
type LooseStatus = (typeof LOOSE_STATUSES)[number];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function parseStatus(value: string, t: ActionT): LooseStatus {
  if (!(LOOSE_STATUSES as readonly string[]).includes(value)) {
    throw new Error(t("invalidStatus"));
  }
  return value as LooseStatus;
}

async function parseLoosePart(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    store: text(formData, "store"),
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    status: parseStatus(String(formData.get("status")), t),
    // An unchecked checkbox is simply absent from the form data.
    paid: formData.get("paid") === "on",
  };
}

function refresh(modelId?: string | null) {
  if (modelId) revalidatePath(`/models/${modelId}`);
  revalidatePath("/expenses");
  revalidatePath("/");
}

/**
 * Marks a part as paid or not: a model's part or a loose one, never a quote's.
 * A part that has not been bought ("to order") cannot be marked as paid, so a
 * hidden paid flag cannot end up excluding it from what is owed once it is
 * ordered. Clearing the flag is always allowed.
 */
export async function setPartPaid(partId: string, paid: boolean) {
  const user = await requireUser();
  const [part] = await db
    .update(parts)
    .set({ paid })
    .where(
      and(
        eq(parts.id, partId),
        eq(parts.userId, user.id),
        isNull(parts.quoteId),
        // Stock parts are already-bought inventory: always paid.
        isNull(parts.stockComponentId),
        paid ? ne(parts.status, "to_order") : undefined,
      ),
    )
    .returning({ modelId: parts.modelId });
  if (part) refresh(part.modelId);
}

export async function createLoosePart(formData: FormData) {
  const user = await requireUser();
  await db.insert(parts).values({ ...(await parseLoosePart(formData)), userId: user.id });
  refresh();
}

export async function updateLoosePart(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(parts)
    .set(await parseLoosePart(formData))
    .where(
      and(
        eq(parts.id, id),
        eq(parts.userId, user.id),
        isNull(parts.modelId),
        isNull(parts.quoteId),
      ),
    );
  refresh();
}

export async function deleteLoosePart(id: string) {
  const user = await requireUser();
  await db
    .delete(parts)
    .where(
      and(
        eq(parts.id, id),
        eq(parts.userId, user.id),
        isNull(parts.modelId),
        isNull(parts.quoteId),
      ),
    );
  refresh();
}
