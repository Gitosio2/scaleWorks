"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { parts, stockComponents } from "@/db/schema";
import { isForeignKeyViolation } from "@/lib/db-errors";
import { isUuid } from "@/lib/input";
import { requireUser } from "@/lib/session";
import { parseComponent } from "./parse";

export async function createComponent(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(stockComponents)
    .values({ ...(await parseComponent(formData)), userId: user.id });
  revalidatePath("/components");
  revalidatePath("/deliveries", "layout");
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
  revalidatePath("/deliveries", "layout");
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
  revalidatePath("/deliveries", "layout");
}

// A component that came on a delivery note and arrived (or whose note was deleted
// before it was received) is marked in hand here, so it is never stuck as ordered.
export async function receiveComponent(id: string) {
  const user = await requireUser();
  await requireId(id);
  await db
    .update(stockComponents)
    .set({ status: "in_hand" })
    .where(and(eq(stockComponents.id, id), eq(stockComponents.userId, user.id)));
  revalidatePath("/components");
  revalidatePath("/deliveries", "layout");
  revalidatePath("/");
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
  revalidatePath("/deliveries", "layout");
}
