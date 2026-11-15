"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { models, parts, quotes, stockComponents } from "@/db/schema";
import { modelTitle } from "@/lib/model-title";
import { partCostCents } from "@/lib/part-cost";
import { requireUser } from "@/lib/session";

// Starts a new quote from a finished model: copies its client, price and
// parts so the quote can be adjusted instead of written from scratch.
// Parts are copied (not moved) and restart as "to order". Parts taken from stock
// become plain parts priced at their current derived cost, so a quote never
// consumes or references stock and converting it back needs no special case.
export async function createQuoteFromModel(modelId: string) {
  const user = await requireUser();

  const [model] = await db
    .select()
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, user.id)));
  if (!model) throw new Error((await getTranslations("actionErrors"))("modelNotFound"));

  const modelParts = await db
    .select({ part: parts, stockUnitPriceCents: stockComponents.priceCents })
    .from(parts)
    .leftJoin(stockComponents, eq(stockComponents.id, parts.stockComponentId))
    .where(and(eq(parts.modelId, modelId), eq(parts.userId, user.id)));

  const quoteId = randomUUID();

  const insertQuote = db.insert(quotes).values({
    id: quoteId,
    userId: user.id,
    clientId: model.clientId,
    title: modelTitle(model.brand, model.name),
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
        modelParts.map(({ part: p, stockUnitPriceCents }) => ({
          userId: user.id,
          quoteId,
          brand: p.brand,
          reference: p.reference,
          description: p.description,
          priceCents:
            p.quantity !== null
              ? partCostCents({ priceCents: p.priceCents, stockUnitPriceCents, quantity: p.quantity })
              : p.priceCents,
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
