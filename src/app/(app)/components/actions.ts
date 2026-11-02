"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { stockComponents } from "@/db/schema";
import { parseEuros, type ActionT } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { parseStockQuantity } from "@/lib/stock";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

// Only http(s) links: anything else (e.g. "javascript:") would be unsafe in an href.
function parseUrl(value: string | null, t: ActionT) {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(t("invalidLink"));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(t("invalidLink"));
  }
  return url.toString();
}

async function parseComponent(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    brand: text(formData, "brand"),
    reference: text(formData, "reference"),
    store: text(formData, "store"),
    url: parseUrl(text(formData, "url"), t),
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

export async function updateComponent(id: string, formData: FormData) {
  const user = await requireUser();
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
  await db
    .delete(stockComponents)
    .where(and(eq(stockComponents.id, id), eq(stockComponents.userId, user.id)));
  revalidatePath("/components");
}
