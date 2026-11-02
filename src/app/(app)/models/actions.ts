"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  clients,
  modelImages,
  models,
  modelPhase,
  modelType,
  paymentStatus,
} from "@/db/schema";
import { parseEuros } from "@/lib/labels";
import { derivePayment } from "@/lib/payments";
import { nextHold } from "@/lib/payment-hold";
import { requireUser } from "@/lib/session";
import { deleteObjects } from "@/lib/storage";

async function parseModel(formData: FormData, userId: string) {
  const t = await getTranslations("actionErrors");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error(t("nameRequired"));

  const phase = String(formData.get("phase"));
  if (!(modelPhase.enumValues as readonly string[]).includes(phase)) {
    throw new Error(t("invalidPhase"));
  }

  // Optional; an empty value means "no type".
  const type = String(formData.get("type") ?? "");
  if (type && !(modelType.enumValues as readonly string[]).includes(type)) {
    throw new Error(t("invalidType"));
  }

  const priceCents = parseEuros(String(formData.get("price") ?? ""), t);

  const payment = String(formData.get("paymentStatus") ?? "none");
  if (!(paymentStatus.enumValues as readonly string[]).includes(payment)) {
    throw new Error(t("invalidPaymentStatus"));
  }
  const { status, depositCents } = derivePayment(
    {
      status: payment as (typeof paymentStatus.enumValues)[number],
      depositCents: parseEuros(String(formData.get("deposit") ?? ""), t),
      priceCents,
    },
    t,
  );

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
    brand: String(formData.get("brand") ?? "").trim() || null,
    name,
    type: (type || null) as (typeof modelType.enumValues)[number] | null,
    company: String(formData.get("company") ?? "").trim() || null,
    clientId,
    priceCents,
    paymentStatus: status,
    depositCents,
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
  const values = await parseModel(formData, user.id);
  await db
    .update(models)
    .set({
      ...values,
      // Editing a model never sets a hold, but settling it in full lifts one.
      ...(values.paymentStatus === "paid" && { paymentHoldAt: null }),
    })
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  revalidatePath("/models");
  revalidatePath(`/models/${id}`);
  revalidatePath("/");
  redirect("/models");
}

// Marks a model as paused because the client has not paid, or lifts the pause.
export async function setPaymentHold(id: string, hold: boolean) {
  const user = await requireUser();
  const [current] = await db
    .select({ paymentStatus: models.paymentStatus, paymentHoldAt: models.paymentHoldAt })
    .from(models)
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  if (!current) return;
  await db
    .update(models)
    .set({
      paymentHoldAt: nextHold({
        current: current.paymentHoldAt,
        requested: hold,
        status: current.paymentStatus,
        now: new Date(),
      }),
    })
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  revalidatePath("/models");
  revalidatePath(`/models/${id}`);
  revalidatePath("/");
}

export async function deleteModel(id: string) {
  const user = await requireUser();
  // Deleting the model cascades to its image rows but not to the stored files,
  // so read their keys first and remove the files afterwards.
  const images = await db
    .select({ key: modelImages.key, thumbKey: modelImages.thumbKey })
    .from(modelImages)
    .where(and(eq(modelImages.modelId, id), eq(modelImages.userId, user.id)));
  await db
    .delete(models)
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  // The model is already gone, so a storage failure must not fail the action or
  // skip the revalidation: log the keys so the files can be removed by hand.
  const keys = images.flatMap((i) => [i.key, i.thumbKey]);
  try {
    await deleteObjects(keys);
  } catch (error) {
    console.error("Stored photos of a deleted model could not be removed:", keys, error);
  }
  revalidatePath("/models");
  revalidatePath("/portfolio");
}
