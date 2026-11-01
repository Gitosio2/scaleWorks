"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { clients, models, quotes } from "@/db/schema";
import { requireUser } from "@/lib/session";

async function parseClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  if (!name) {
    const t = await getTranslations("actionErrors");
    throw new Error(t("nameRequired"));
  }
  return { name, contact: contact || null, company: company || null };
}

export async function createClient(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(clients)
    .values({ ...(await parseClient(formData)), userId: user.id });
  revalidatePath("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(clients)
    .set(await parseClient(formData))
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClient(id: string) {
  const user = await requireUser();
  // The foreign keys are ON DELETE SET NULL, so without this check the
  // client's models and quotes would silently lose their client.
  const [[{ n: modelCount }], [{ n: quoteCount }]] = await Promise.all([
    db
      .select({ n: count() })
      .from(models)
      .where(and(eq(models.clientId, id), eq(models.userId, user.id))),
    db
      .select({ n: count() })
      .from(quotes)
      .where(and(eq(quotes.clientId, id), eq(quotes.userId, user.id))),
  ]);
  if (modelCount + quoteCount > 0) {
    const t = await getTranslations("actionErrors");
    throw new Error(t("clientHasRecords"));
  }
  await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
  revalidatePath("/clients");
}
