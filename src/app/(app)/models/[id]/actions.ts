"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { models, timeEntries } from "@/db/schema";
import { parseDuration } from "@/lib/labels";
import { requireUser } from "@/lib/session";

export async function addTimeEntry(modelId: string, formData: FormData) {
  const user = await requireUser();

  // The model must belong to the current user.
  const [owned] = await db
    .select({ id: models.id })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, user.id)));
  if (!owned) throw new Error("Model not found");

  const minutes = parseDuration(String(formData.get("duration") ?? ""));
  if (minutes === null || minutes <= 0 || minutes > 24 * 60) {
    throw new Error("Duration must be hh:mm, up to 24:00");
  }
  const workedOn = String(formData.get("workedOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workedOn)) throw new Error("Invalid date");

  await db.insert(timeEntries).values({
    userId: user.id,
    modelId,
    workedOn,
    minutes,
  });
  revalidatePath(`/models/${modelId}`);
}

export async function deleteTimeEntry(modelId: string, entryId: string) {
  const user = await requireUser();
  await db
    .delete(timeEntries)
    .where(
      and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.modelId, modelId),
        eq(timeEntries.userId, user.id),
      ),
    );
  revalidatePath(`/models/${modelId}`);
}
