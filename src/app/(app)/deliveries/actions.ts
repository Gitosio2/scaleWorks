"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumables, deliveries, parts, stockComponents } from "@/db/schema";
import { deliveryState, newLineStatus } from "@/lib/delivery";
import { capText, isUuid, parseHttpUrl } from "@/lib/input";
import type { ActionT } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { parseComponent } from "../components/parse";
import { parseConsumable, parseStatus } from "../consumables/parse";
import { parseLoosePart } from "../expenses/parse";

const MAX_TEXT = 500;
const MAX_URL = 2000;

export type LineKind = "part" | "consumable" | "component";

function text(formData: FormData, key: string, max: number, t: ActionT) {
  return capText(String(formData.get(key) ?? "").trim() || null, max, t);
}

function tErrors() {
  return getTranslations("actionErrors");
}

async function parseDelivery(formData: FormData) {
  const t = await tErrors();
  const name = text(formData, "name", MAX_TEXT, t);
  if (!name) throw new Error(t("nameRequired"));
  return {
    name,
    carrier: text(formData, "carrier", MAX_TEXT, t),
    trackingUrl: parseHttpUrl(text(formData, "trackingUrl", MAX_URL, t), t),
  };
}

// Every mutation names the delivery it works on; it must belong to the user.
async function requireDelivery(id: string, userId: string) {
  const t = await tErrors();
  if (!isUuid(id)) throw new Error(t("invalidId"));
  const [row] = await db
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(and(eq(deliveries.id, id), eq(deliveries.userId, userId)));
  if (!row) throw new Error(t("deliveryNotFound"));
}

async function currentState(id: string, userId: string) {
  const [p, c, s] = await Promise.all([
    db.select({ status: parts.status }).from(parts).where(and(eq(parts.deliveryId, id), eq(parts.userId, userId))),
    db.select({ status: consumables.status }).from(consumables).where(and(eq(consumables.deliveryId, id), eq(consumables.userId, userId))),
    db.select({ status: stockComponents.status }).from(stockComponents).where(and(eq(stockComponents.deliveryId, id), eq(stockComponents.userId, userId))),
  ]);
  return deliveryState([...p, ...c, ...s].map((r) => r.status));
}

function refresh(id?: string) {
  revalidatePath("/deliveries");
  if (id) revalidatePath(`/deliveries/${id}`);
  // Lines also show up in these lists and totals.
  revalidatePath("/expenses");
  revalidatePath("/consumables");
  revalidatePath("/components");
  revalidatePath("/");
}

export async function createDelivery(formData: FormData) {
  const user = await requireUser();
  const [row] = await db
    .insert(deliveries)
    .values({ ...(await parseDelivery(formData)), userId: user.id })
    .returning({ id: deliveries.id });
  revalidatePath("/deliveries");
  redirect(`/deliveries/${row.id}`);
}

export async function updateDelivery(id: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(id, user.id);
  await db
    .update(deliveries)
    .set(await parseDelivery(formData))
    .where(and(eq(deliveries.id, id), eq(deliveries.userId, user.id)));
  refresh(id);
}

// The lines stay (their deliveryId is cleared by the foreign key).
export async function deleteDelivery(id: string) {
  const user = await requireUser();
  await requireDelivery(id, user.id);
  await db.delete(deliveries).where(and(eq(deliveries.id, id), eq(deliveries.userId, user.id)));
  refresh();
  redirect("/deliveries");
}

// Every line of the delivery goes in hand, in one batch. Lines already in hand stay.
export async function markDelivered(id: string) {
  const user = await requireUser();
  await requireDelivery(id, user.id);
  const inHand = { status: "in_hand" as const };
  await db.batch([
    db.update(parts).set(inHand).where(and(eq(parts.deliveryId, id), eq(parts.userId, user.id))),
    db.update(consumables).set(inHand).where(and(eq(consumables.deliveryId, id), eq(consumables.userId, user.id))),
    db.update(stockComponents).set(inHand).where(and(eq(stockComponents.deliveryId, id), eq(stockComponents.userId, user.id))),
  ]);
  refresh(id);
}

export async function addDeliveryPart(deliveryId: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  const values = await parseLoosePart(formData);
  const state = await currentState(deliveryId, user.id);
  await db.insert(parts).values({
    ...values,
    status: newLineStatus(state, values.status),
    userId: user.id,
    deliveryId,
  });
  refresh(deliveryId);
}

export async function addDeliveryConsumable(deliveryId: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  const values = await parseConsumable(formData);
  const state = await currentState(deliveryId, user.id);
  await db.insert(consumables).values({
    ...values,
    status: newLineStatus(state, values.status),
    userId: user.id,
    deliveryId,
  });
  refresh(deliveryId);
}

export async function addDeliveryComponent(deliveryId: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  const values = await parseComponent(formData);
  const state = await currentState(deliveryId, user.id);
  await db.insert(stockComponents).values({
    ...values,
    status: newLineStatus(state, "ordered"),
    userId: user.id,
    deliveryId,
  });
  refresh(deliveryId);
}

// Edits of a line. They only touch rows that are on a delivery of this user.
export async function updateDeliveryPart(deliveryId: string, id: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  await db
    .update(parts)
    .set(await parseLoosePart(formData))
    .where(and(eq(parts.id, id), eq(parts.deliveryId, deliveryId), eq(parts.userId, user.id)));
  refresh(deliveryId);
}

export async function updateDeliveryConsumable(deliveryId: string, id: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  await db
    .update(consumables)
    .set(await parseConsumable(formData))
    .where(and(eq(consumables.id, id), eq(consumables.deliveryId, deliveryId), eq(consumables.userId, user.id)));
  refresh(deliveryId);
}

export async function updateDeliveryComponent(deliveryId: string, id: string, formData: FormData) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  await db
    .update(stockComponents)
    .set(await parseComponent(formData))
    .where(and(eq(stockComponents.id, id), eq(stockComponents.deliveryId, deliveryId), eq(stockComponents.userId, user.id)));
  refresh(deliveryId);
}

// Per-line status, for partial deliveries.
export async function setLineStatus(
  deliveryId: string,
  kind: LineKind,
  id: string,
  status: string,
) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  const next = parseStatus(status, await tErrors());
  if (kind === "part") {
    await db
      .update(parts)
      // Back to "to order" means not bought, so it cannot stay marked as paid.
      .set({ status: next, ...(next === "to_order" ? { paid: false } : {}) })
      .where(and(eq(parts.id, id), eq(parts.deliveryId, deliveryId), eq(parts.userId, user.id)));
  } else if (kind === "consumable") {
    await db
      .update(consumables)
      .set({ status: next, active: true })
      .where(and(eq(consumables.id, id), eq(consumables.deliveryId, deliveryId), eq(consumables.userId, user.id)));
  } else {
    await db
      .update(stockComponents)
      .set({ status: next })
      .where(and(eq(stockComponents.id, id), eq(stockComponents.deliveryId, deliveryId), eq(stockComponents.userId, user.id)));
  }
  refresh(deliveryId);
}

// Deletes the line itself, not just its link to the delivery.
export async function deleteLine(deliveryId: string, kind: LineKind, id: string) {
  const user = await requireUser();
  await requireDelivery(deliveryId, user.id);
  const table = kind === "part" ? parts : kind === "consumable" ? consumables : stockComponents;
  await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.deliveryId, deliveryId), isNotNull(table.deliveryId), eq(table.userId, user.id)));
  refresh(deliveryId);
}
