"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { models, parts, stockComponents } from "@/db/schema";
import { isUuid } from "@/lib/input";
import { requireUser } from "@/lib/session";
import { parseUsedQuantity } from "@/lib/stock";

// Parts taken from the warehouse. The driver (neon-http) has no interactive
// transactions, so each stock movement is ONE SQL statement: a data-modifying
// CTE moves the stock and writes the part together, atomically, with the stock
// guard (quantity >= n) inside the same statement. There is no read-then-write
// window, so concurrent requests cannot oversell stock or lose units.

function refresh(modelId: string) {
  revalidatePath(`/models/${modelId}`);
  revalidatePath("/models");
  revalidatePath("/components");
  revalidatePath("/");
}

export async function addStockPart(modelId: string, formData: FormData) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");

  const componentId = String(formData.get("componentId") ?? "");
  if (!isUuid(modelId)) throw new Error(t("modelNotFound"));
  if (!isUuid(componentId)) throw new Error(t("componentNotFound"));
  const quantity = parseUsedQuantity(String(formData.get("quantity") ?? ""), t);

  const [owned] = await db
    .select({ id: models.id })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.userId, user.id)));
  if (!owned) throw new Error(t("modelNotFound"));

  // The component is only read to tell "not yours / gone" from "not enough".
  const [component] = await db
    .select({ id: stockComponents.id })
    .from(stockComponents)
    .where(and(eq(stockComponents.id, componentId), eq(stockComponents.userId, user.id)));
  if (!component) throw new Error(t("componentNotFound"));

  // Decrement (guarded) and insert in one statement. The part is a snapshot of
  // the component's labels; its cost is never stored, it is derived live.
  const result = await db.execute(sql`
    WITH taken AS (
      UPDATE stock_components
      SET quantity = quantity - ${quantity}::int, updated_at = now()
      WHERE id = ${componentId}::uuid AND user_id = ${user.id} AND quantity >= ${quantity}::int
      RETURNING id, brand, reference, description, store, url
    )
    INSERT INTO parts (user_id, model_id, brand, reference, description, store, url, status, paid, stock_component_id, quantity)
    SELECT ${user.id}, ${modelId}::uuid, brand, reference, description, store, url, 'in_hand', true, id, ${quantity}::int
    FROM taken
    RETURNING id
  `);
  if (result.rows.length === 0) throw new Error(t("insufficientStock"));
  refresh(modelId);
}

// Changes how many units a stock part uses. Stock moves by the difference:
// using more takes the extra from stock (guarded), using fewer gives units back.
export async function updateStockPartQuantity(
  modelId: string,
  partId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  if (!isUuid(modelId) || !isUuid(partId)) throw new Error(t("partNotFound"));
  const quantity = parseUsedQuantity(String(formData.get("quantity") ?? ""), t);

  const result = await db.execute(sql`
    WITH p AS (
      SELECT id, stock_component_id, quantity
      FROM parts
      WHERE id = ${partId}::uuid AND model_id = ${modelId}::uuid AND user_id = ${user.id}
        AND stock_component_id IS NOT NULL
      FOR UPDATE
    ),
    moved AS (
      UPDATE stock_components s
      SET quantity = s.quantity - (${quantity}::int - p.quantity), updated_at = now()
      FROM p
      WHERE s.id = p.stock_component_id AND s.user_id = ${user.id}
        AND s.quantity - (${quantity}::int - p.quantity) >= 0
      RETURNING s.id
    )
    UPDATE parts SET quantity = ${quantity}::int
    WHERE id IN (SELECT id FROM p) AND EXISTS (SELECT 1 FROM moved)
    RETURNING id
  `);
  if (result.rows.length === 0) {
    // Nothing changed: either the part is gone or the stock cannot cover the increase.
    const [still] = await db
      .select({ id: parts.id })
      .from(parts)
      .where(and(eq(parts.id, partId), eq(parts.modelId, modelId), eq(parts.userId, user.id)));
    throw new Error(still ? t("insufficientStock") : t("partNotFound"));
  }
  refresh(modelId);
}
