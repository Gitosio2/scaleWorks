"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumables } from "@/db/schema";
import { parseStatus, parseConsumable } from "./parse";
import { DEPLETED } from "./depleted";
import { requireUser } from "@/lib/session";

export async function createConsumable(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(consumables)
    .values({ ...(await parseConsumable(formData)), userId: user.id });
  revalidatePath("/consumables");
  revalidatePath("/deliveries", "layout");
}

export async function updateConsumable(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(consumables)
    .set(await parseConsumable(formData))
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
  revalidatePath("/deliveries", "layout");
}

export async function updateConsumableStatus(id: string, status: string) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  const change =
    status === DEPLETED
      ? { active: false }
      : { status: parseStatus(status, t), active: true };
  await db
    .update(consumables)
    .set(change)
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
  revalidatePath("/deliveries", "layout");
  revalidatePath("/models");
}

export async function deleteConsumable(id: string) {
  const user = await requireUser();
  await db
    .delete(consumables)
    .where(and(eq(consumables.id, id), eq(consumables.userId, user.id)));
  revalidatePath("/consumables");
  revalidatePath("/deliveries", "layout");
}
