"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { parts, stockComponents } from "@/db/schema";
import { isForeignKeyViolation } from "@/lib/db-errors";
import { capText, isUuid, parseHttpUrl } from "@/lib/input";
import { parseEuros, type ActionT } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { parseStockQuantity } from "@/lib/stock";

const MAX_TEXT = 500;
const MAX_URL = 2000;

function text(formData: FormData, key: string, max: number, t: ActionT) {
  return capText(String(formData.get(key) ?? "").trim() || null, max, t);
}

async function parseComponent(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description", MAX_TEXT, t);
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    brand: text(formData, "brand", MAX_TEXT, t),
    reference: text(formData, "reference", MAX_TEXT, t),
    store: text(formData, "store", MAX_TEXT, t),
    url: parseHttpUrl(text(formData, "url", MAX_URL, t), t),
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    quantity: parseStockQuantity(String(formData.get("quantity") ?? ""), t),
  };
}

export async function createComponent(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(stockComponents)
    .values({ ...(await parseComponent(formData)), userId: user.id });
  revalidatePath("/components");
}

async function requireId(id: string) {
  if (!isUuid(id)) throw new Error((await getTranslations("actionErrors"))("invalidId"));
}

export async function updateComponent(id: string, formData: FormData) {
  const user = await requireUser();
  await requireId(id);
  await db
    .update(stockComponents)
    .set(await parseComponent(formData))
    .where(and(eq(stockComponents.id, id), eq(stockComponents.userId, user.id)));
  revalidatePath("/components");
}

// Quick +/- step. Done in SQL so concurrent clicks stay consistent and the
// count is clamped at zero.
export async function adjustComponentQuantity(id: string, delta: number) {
  const user = await requireUser();
  await requireId(id);
  const t = await getTranslations("actionErrors");
  if (!Number.isInteger(delta) || Math.abs(delta) > 1000) {
    throw new Error(t("invalidStockQuantity"));
  }
  await db
    .update(stockComponents)
    .set({ quantity: sql`GREATEST(${stockComponents.quantity} + ${delta}, 0)` })
    .where(and(eq(stockComponents.id, id), eq(stockComponents.userId, user.id)));
  revalidatePath("/components");
}

export async function deleteComponent(id: string) {
  const user = await requireUser();
  await requireId(id);
  const t = await getTranslations("actionErrors");
  // A component used by a model's part cannot go: that part's cost is derived from it.
  const [used] = await db
    .select({ id: parts.id })
    .from(parts)
    .where(and(eq(parts.stockComponentId, id), eq(parts.userId, user.id)))
    .limit(1);
  if (used) throw new Error(t("componentInUse"));
  try {
    await db
      .delete(stockComponents)
      .where(and(eq(stockComponents.id, id), eq(stockComponents.userId, user.id)));
  } catch (error) {
    // Lost a race with a concurrent "add to model": the FK still protects it.
    if (isForeignKeyViolation(error)) throw new Error(t("componentInUse"));
    throw error;
  }
  revalidatePath("/components");
}
