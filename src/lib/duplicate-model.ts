import type { modelConsumables, models, parts } from "@/db/schema";

type Model = typeof models.$inferSelect;
type Part = typeof parts.$inferSelect;
type ModelConsumable = typeof modelConsumables.$inferSelect;

/**
 * Values for a copy of a model: the descriptive data, client and price are kept,
 * while everything about the progress of the build starts over (phase, payment,
 * hold, dates and publication fall back to their defaults).
 */
export function duplicateModelValues(model: Model, id: string, name: string) {
  return {
    id,
    userId: model.userId,
    clientId: model.clientId,
    brand: model.brand,
    name,
    type: model.type,
    tags: model.tags,
    company: model.company,
    year: model.year,
    priceCents: model.priceCents,
    notes: model.notes,
  } satisfies typeof models.$inferInsert;
}

/**
 * Copies of the plain parts of a model, restarted as "to order" and unpaid and
 * outside any delivery note. Parts taken from stock are left out: copying them
 * would take units from the warehouse for a build that has not started.
 */
export function duplicatePartValues(modelParts: Part[], modelId: string) {
  return modelParts
    .filter((p) => p.stockComponentId === null)
    .map((p) => ({
      userId: p.userId,
      modelId,
      brand: p.brand,
      reference: p.reference,
      description: p.description,
      priceCents: p.priceCents,
      store: p.store,
      url: p.url,
      status: "to_order" as const,
    })) satisfies (typeof parts.$inferInsert)[];
}

/** Links the copy to the same consumables, with the same amounts. */
export function duplicateConsumableLinks(links: ModelConsumable[], modelId: string) {
  return links.map((l) => ({
    modelId,
    consumableId: l.consumableId,
    quantity: l.quantity,
  })) satisfies (typeof modelConsumables.$inferInsert)[];
}
