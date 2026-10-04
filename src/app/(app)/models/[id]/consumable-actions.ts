"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { consumables, modelConsumables, models } from "@/db/schema";
import { parseQuantity } from "@/lib/labels";
import { requireUser } from "@/lib/session";

// The custom field wins over the quick-pick selector when filled.
function readQuantity(formData: FormData) {
  const custom = String(formData.get("quantityCustom") ?? "").trim();
  const raw = custom || String(formData.get("quantity") ?? "");
  const q = parseQuantity(raw);
  return q === null ? null : q.toFixed(5);
}

// Link tables have no userId, so ownership is checked through both parents.
async function assertOwnsModel(modelId: string, userId: string) {
  const [owned] = await db
    .select({ id: models.id })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, userId)));
  if (!owned) throw new Error("Model not found");
}

export async function setModelConsumable(modelId: string, formData: FormData) {
  const user = await requireUser();
  await assertOwnsModel(modelId, user.id);

  const consumableId = String(formData.get("consumableId") ?? "");
  const [owned] = await db
    .select({ id: consumables.id })
    .from(consumables)
    .where(and(eq(consumables.id, consumableId), eq(consumables.userId, user.id)));
  if (!owned) throw new Error("Consumable not found");

  // Upsert: choosing an already linked consumable just updates its quantity.
  const quantity = readQuantity(formData);
  await db
    .insert(modelConsumables)
    .values({ modelId, consumableId, quantity })
    .onConflictDoUpdate({
      target: [modelConsumables.modelId, modelConsumables.consumableId],
      set: { quantity },
    });
  revalidatePath(`/models/${modelId}`);
}

export async function updateModelConsumableQuantity(
  modelId: string,
  consumableId: string,
  formData: FormData,
) {
  const user = await requireUser();
  await assertOwnsModel(modelId, user.id);
  await db
    .update(modelConsumables)
    .set({ quantity: readQuantity(formData) })
    .where(
      and(
        eq(modelConsumables.modelId, modelId),
        eq(modelConsumables.consumableId, consumableId),
      ),
    );
  revalidatePath(`/models/${modelId}`);
}

export async function removeModelConsumable(
  modelId: string,
  consumableId: string,
) {
  const user = await requireUser();
  await assertOwnsModel(modelId, user.id);
  await db
    .delete(modelConsumables)
    .where(
      and(
        eq(modelConsumables.modelId, modelId),
        eq(modelConsumables.consumableId, consumableId),
      ),
    );
  revalidatePath(`/models/${modelId}`);
}
