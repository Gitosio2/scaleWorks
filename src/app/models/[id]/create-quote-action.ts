"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { models, parts, quotes } from "@/db/schema";
import { requireUser } from "@/lib/session";

// Starts a new quote from a finished model: copies its client, price and
// parts so the quote can be adjusted instead of written from scratch.
// Parts are copied (not moved) and restart as "to order".
export async function createQuoteFromModel(modelId: string) {
  const user = await requireUser();

  const [model] = await db
    .select()
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, user.id)));
  if (!model) throw new Error("Model not found");

  const modelParts = await db
    .select()
    .from(parts)
    .where(and(eq(parts.modelId, modelId), eq(parts.userId, user.id)));

  const quoteId = randomUUID();

  const insertQuote = db.insert(quotes).values({
    id: quoteId,
    userId: user.id,
    clientId: model.clientId,
    title: model.name,
    priceCents: model.priceCents,
    status: "open",
  });

  if (modelParts.length === 0) {
    await insertQuote;
  } else {
    // One batch = one transaction: the quote never exists without its parts.
    await db.batch([
      insertQuote,
      db.insert(parts).values(
        modelParts.map((p) => ({
          userId: user.id,
          quoteId,
          brand: p.brand,
          reference: p.reference,
          description: p.description,
          priceCents: p.priceCents,
          store: p.store,
          url: p.url,
          status: "to_order" as const,
        })),
      ),
    ]);
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${quoteId}`);
}
