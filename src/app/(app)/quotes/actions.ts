"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { clients, quotes, quoteStatus } from "@/db/schema";
import { parseEuros } from "@/lib/labels";
import { requireUser } from "@/lib/session";

async function parseQuote(formData: FormData, userId: string) {
  const t = await getTranslations("actionErrors");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error(t("titleRequired"));

  const status = String(formData.get("status"));
  if (!(quoteStatus.enumValues as readonly string[]).includes(status)) {
    throw new Error(t("invalidStatus"));
  }

  // The client must belong to the current user.
  const clientId = String(formData.get("clientId") ?? "") || null;
  if (clientId) {
    const [owned] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
    if (!owned) throw new Error(t("clientNotFound"));
  }

  return {
    title,
    clientId,
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    status: status as (typeof quoteStatus.enumValues)[number],
  };
}

export async function createQuote(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(quotes)
    .values({ ...(await parseQuote(formData, user.id)), userId: user.id });
  revalidatePath("/quotes");
}

export async function updateQuote(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(quotes)
    .set(await parseQuote(formData, user.id))
    .where(and(eq(quotes.id, id), eq(quotes.userId, user.id)));
  revalidatePath("/quotes");
  redirect("/quotes");
}

export async function deleteQuote(id: string) {
  const user = await requireUser();
  await db
    .delete(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.userId, user.id)));
  revalidatePath("/quotes");
}

const MAX_NOTES_LENGTH = 5000;

export async function updateQuoteNotes(quoteId: string, formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");

  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > MAX_NOTES_LENGTH) throw new Error(t("notesTooLong"));

  const updated = await db
    .update(quotes)
    .set({ notes: notes || null })
    .where(and(eq(quotes.id, quoteId), eq(quotes.userId, user.id)))
    .returning({ id: quotes.id });
  if (updated.length === 0) throw new Error(t("quoteNotFound"));
  revalidatePath(`/quotes/${quoteId}`);
}
