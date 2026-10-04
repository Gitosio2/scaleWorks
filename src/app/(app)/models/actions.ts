"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, models, modelPhase } from "@/db/schema";
import { parseEuros } from "@/lib/labels";
import { requireUser } from "@/lib/session";

async function parseModel(formData: FormData, userId: string) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const phase = String(formData.get("phase"));
  if (!(modelPhase.enumValues as readonly string[]).includes(phase)) {
    throw new Error("Invalid phase");
  }

  const priceCents = parseEuros(String(formData.get("price") ?? ""));

  // The client must belong to the current user.
  const clientId = String(formData.get("clientId") ?? "") || null;
  if (clientId) {
    const [owned] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
    if (!owned) throw new Error("Client not found");
  }

  return {
    name,
    company: String(formData.get("company") ?? "").trim() || null,
    clientId,
    priceCents,
    phase: phase as (typeof modelPhase.enumValues)[number],
    requestedDate: String(formData.get("requestedDate") ?? "") || null,
    estimatedDate: String(formData.get("estimatedDate") ?? "") || null,
  };
}

export async function createModel(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(models)
    .values({ ...(await parseModel(formData, user.id)), userId: user.id });
  revalidatePath("/models");
}

export async function updateModel(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(models)
    .set(await parseModel(formData, user.id))
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  revalidatePath("/models");
  redirect("/models");
}

export async function deleteModel(id: string) {
  const user = await requireUser();
  await db
    .delete(models)
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  revalidatePath("/models");
}
