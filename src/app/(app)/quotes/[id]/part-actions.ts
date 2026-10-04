"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { parts, quotes, supplyStatus } from "@/db/schema";
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

// Only http(s) links: anything else (e.g. "javascript:") would be unsafe in an href.
function parseUrl(value: string | null) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invalid link");
  }
  return url.toString();
}

export async function addQuotePart(quoteId: string, formData: FormData) {
  const user = await requireUser();

  // The quote must belong to the current user.
  const [owned] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.userId, user.id)));
  if (!owned) throw new Error("Quote not found");

  const description = text(formData, "description");
  if (!description) throw new Error("Description is required");

  await db.insert(parts).values({
    userId: user.id,
    quoteId,
    brand: text(formData, "brand"),
    reference: text(formData, "reference"),
    description,
    priceCents: parseEuros(String(formData.get("price") ?? "")),
    store: text(formData, "store"),
    url: parseUrl(text(formData, "url")),
    status: parseStatus(String(formData.get("status"))),
  });
  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuotePartStatus(
  quoteId: string,
  partId: string,
  formData: FormData,
) {
  const user = await requireUser();
  await db
    .update(parts)
    .set({ status: parseStatus(String(formData.get("status"))) })
    .where(
      and(
        eq(parts.id, partId),
        eq(parts.quoteId, quoteId),
        eq(parts.userId, user.id),
      ),
    );
  revalidatePath(`/quotes/${quoteId}`);
}

export async function deleteQuotePart(quoteId: string, partId: string) {
  const user = await requireUser();
  await db
    .delete(parts)
    .where(
      and(
        eq(parts.id, partId),
        eq(parts.quoteId, quoteId),
        eq(parts.userId, user.id),
      ),
    );
  revalidatePath(`/quotes/${quoteId}`);
}
