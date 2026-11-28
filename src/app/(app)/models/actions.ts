"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  clients,
  consumables,
  modelConsumables,
  modelImages,
  models,
  modelPhase,
  modelType,
  parts,
  paymentStatus,
} from "@/db/schema";
import { isUuid, parseYear } from "@/lib/input";
import { parseTags } from "@/lib/tags";
import { parseEuros } from "@/lib/labels";
import {
  duplicateConsumableLinks,
  duplicateModelValues,
  duplicatePartValues,
} from "@/lib/duplicate-model";
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

  const year = parseYear(String(formData.get("year") ?? ""), t);

  const typedType = (type || null) as (typeof modelType.enumValues)[number] | null;

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
    type: typedType,
    tags: parseTags(formData.getAll("tags").map(String), typedType, t),
    company: String(formData.get("company") ?? "").trim() || null,
    year,
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

// Starts a new model from an existing one: same data, client, price, plain parts
// and consumables, but the build, payment and dates start over. Opens the copy's
// edit page so it can be renamed or adjusted right away.
export async function duplicateModel(id: string) {
  const user = await requireUser();
  const t = await getTranslations("models");

  const [model] = await db
    .select()
    .from(models)
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  if (!model) throw new Error((await getTranslations("actionErrors"))("modelNotFound"));

  const [modelParts, links] = await Promise.all([
    db
      .select()
      .from(parts)
      .where(and(eq(parts.modelId, id), eq(parts.userId, user.id))),
    db
      .select({ link: modelConsumables })
      .from(modelConsumables)
      .innerJoin(consumables, eq(modelConsumables.consumableId, consumables.id))
      .where(and(eq(modelConsumables.modelId, id), eq(consumables.userId, user.id))),
  ]);

  const copyId = randomUUID();
  const newParts = duplicatePartValues(modelParts, copyId);
  const newLinks = duplicateConsumableLinks(
    links.map((l) => l.link),
    copyId,
  );

  // One batch = one transaction: the copy never exists without its parts.
  await db.batch([
    db
      .insert(models)
      .values(duplicateModelValues(model, copyId, t("copyName", { name: model.name }))),
    ...(newParts.length > 0 ? [db.insert(parts).values(newParts)] : []),
    ...(newLinks.length > 0 ? [db.insert(modelConsumables).values(newLinks)] : []),
  ]);

  revalidatePath("/models");
  redirect(`/models/${copyId}/edit`);
}

// Marks a model as paused because the client has not paid, or lifts the pause.
export async function setPaymentHold(id: string, hold: boolean) {
  const user = await requireUser();
  const [current] = await db
    .select({ paymentStatus: models.paymentStatus, paymentHoldAt: models.paymentHoldAt })
    .from(models)
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  if (!current) return;
  const paymentHoldAt = nextHold({
    current: current.paymentHoldAt,
    requested: hold,
    status: current.paymentStatus,
    now: new Date(),
  });
  await db
    .update(models)
    .set({ paymentHoldAt })
    .where(
      and(
        eq(models.id, id),
        eq(models.userId, user.id),
        // Setting a hold must not race a payment saved in between: only still-unpaid models.
        paymentHoldAt ? ne(models.paymentStatus, "paid") : undefined,
      ),
    );
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
  // Parts taken from stock go back to the warehouse with the model, in the same
  // statement as the delete (no interactive transactions on neon-http). The refund
  // is read from the rows this very statement deletes (RETURNING), so a part removed
  // concurrently by deletePart is refunded once, by whichever statement deleted it.
  if (isUuid(id)) {
    await db.execute(sql`
      WITH owned AS (
        SELECT id FROM models WHERE id = ${id}::uuid AND user_id = ${user.id}
      ),
      removed AS (
        DELETE FROM parts
        WHERE model_id IN (SELECT id FROM owned) AND stock_component_id IS NOT NULL
        RETURNING stock_component_id, quantity
      ),
      back AS (
        SELECT stock_component_id, sum(quantity)::int AS units
        FROM removed
        GROUP BY stock_component_id
      ),
      gone AS (
        -- Reading "removed" makes the model delete wait for the parts delete, so the
        -- cascade can never remove the parts before their units are counted.
        DELETE FROM models
        WHERE id IN (SELECT id FROM owned) AND (SELECT count(*) FROM removed) >= 0
        RETURNING id
      )
      UPDATE stock_components s
      SET quantity = s.quantity + back.units, updated_at = now()
      FROM back
      WHERE s.id = back.stock_component_id
    `);
  }
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
