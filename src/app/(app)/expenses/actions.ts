"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { parts } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { parseLoosePart } from "./parse";

function refresh(modelId?: string | null) {
  if (modelId) revalidatePath(`/models/${modelId}`);
  revalidatePath("/expenses");
  revalidatePath("/deliveries", "layout");
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
