"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { consumables, supplyStatus } from "@/db/schema";
import { parseEuros } from "@/lib/labels";
import { requireUser } from "@/lib/session";

type SupplyStatus = (typeof supplyStatus.enumValues)[number];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function parseStatus(value: string): SupplyStatus {
  if (!(supplyStatus.enumValues as readonly string[]).includes(value)) {
    throw new Error("Invalid status");
  }
  return value as SupplyStatus;
}

function parseConsumable(formData: FormData) {
  const description = text(formData, "description");
  if (!description) throw new Error("Description is required");
  return {
    description,
    store: text(formData, "store"),
    reference: text(formData, "reference"),
    priceCents: parseEuros(String(formData.get("price") ?? "")),
    status: parseStatus(String(formData.get("status"))),
  };
}

export async function createConsumable(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(consumables)
    .values({ ...parseConsumable(formData), userId: user.id });
  revalidatePath("/consumables");
}

export async function updateConsumable(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(consumables)
    .set(parseConsumable(formData))
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
  redirect("/consumables");
}

export async function updateConsumableStatus(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(consumables)
    .set({ status: parseStatus(String(formData.get("status"))) })
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
