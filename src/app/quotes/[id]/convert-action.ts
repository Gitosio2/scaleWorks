"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { models, parts, quotes } from "@/db/schema";
import { requireUser } from "@/lib/session";

// Turns a quote into a model: creates the model, moves the quote's parts to
// it and deletes the quote. The three writes run as one batch (a single
// transaction), so a failure leaves nothing half-done.
export async function convertQuoteToModel(quoteId: string) {
  const user = await requireUser();

  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.userId, user.id)));
  if (!quote) throw new Error("Quote not found");

  const modelId = randomUUID();

  await db.batch([
    db.insert(models).values({
      id: modelId,
      userId: user.id,
      clientId: quote.clientId,
      name: quote.title,
      priceCents: quote.priceCents,
      phase: "not_started",
    }),
    db
      .update(parts)
      .set({ modelId, quoteId: null })
      .where(and(eq(parts.quoteId, quoteId), eq(parts.userId, user.id))),
    // Order matters: parts must be moved before the quote is deleted, since
    // deleting a quote cascades to the parts still pointing at it.
    db
      .delete(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.userId, user.id))),
  ]);

  revalidatePath("/quotes");
  revalidatePath("/models");
  redirect(`/models/${modelId}`);
}
