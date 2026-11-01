"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumableCategory, consumables, supplyStatus } from "@/db/schema";
import { parseEuros, type ActionT } from "@/lib/labels";
import { HEX_COLOR } from "@/lib/ral";
import { requireUser } from "@/lib/session";

type SupplyStatus = (typeof supplyStatus.enumValues)[number];
type ConsumableCategory = (typeof consumableCategory.enumValues)[number];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function parseStatus(value: string, t: ActionT): SupplyStatus {
  if (!(supplyStatus.enumValues as readonly string[]).includes(value)) {
    throw new Error(t("invalidStatus"));
  }
  return value as SupplyStatus;
}

function parseColor(value: string | null, t: ActionT): string | null {
  if (value === null) return null;
  if (!HEX_COLOR.test(value)) throw new Error(t("invalidColor"));
  return value.toLowerCase();
}

function parseCategory(value: string, t: ActionT): ConsumableCategory {
  if (!(consumableCategory.enumValues as readonly string[]).includes(value)) {
    throw new Error(t("invalidCategory"));
  }
  return value as ConsumableCategory;
}

async function parseConsumable(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    store: text(formData, "store"),
    reference: text(formData, "reference"),
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    status: parseStatus(String(formData.get("status")), t),
    category: parseCategory(String(formData.get("category")), t),
    colorHex: parseColor(text(formData, "color"), t),
  };
}

export async function createConsumable(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(consumables)
    .values({ ...(await parseConsumable(formData)), userId: user.id });
  revalidatePath("/consumables");
}

export async function updateConsumable(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(consumables)
    .set(await parseConsumable(formData))
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
}

export async function updateConsumableStatus(id: string, status: string) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  await db
    .update(consumables)
    .set({ status: parseStatus(status, t) })
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
}

export async function deleteConsumable(id: string) {
  const user = await requireUser();
  await db
    .delete(consumables)
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
}
