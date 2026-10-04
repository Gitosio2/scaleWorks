"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/session";

function parseClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  if (!name || !contact) throw new Error("Name and contact are required");
  return { name, contact, company: company || null };
}

export async function createClient(formData: FormData) {
  const user = await requireUser();
  await db.insert(clients).values({ ...parseClient(formData), userId: user.id });
  revalidatePath("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(clients)
    .set(parseClient(formData))
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClient(id: string) {
  const user = await requireUser();
  await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
  revalidatePath("/clients");
}
