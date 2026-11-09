// Cost of a part. A part linked to a stock component stores no price: it is the
// component's current unit price times the units used. An unlinked part uses its
// own price. A linked part is recognised by its quantity (the schema only allows
// a quantity together with a stock component).
// The SQL twin of this rule is modelPartsCostSql in db/part-cost-sql.ts; keep both in sync.
export function partCostCents({
  priceCents,
  stockUnitPriceCents,
  quantity,
}: {
  priceCents: number | null;
  stockUnitPriceCents: number | null;
  quantity: number | null;
}) {
  if (quantity !== null) return (stockUnitPriceCents ?? 0) * quantity;
  return priceCents ?? 0;
}

// Units to take from stock (positive) or give back (negative) when the quantity
// used by a linked part changes.
export function stockPartDelta(oldQuantity: number, newQuantity: number) {
  return newQuantity - oldQuantity;
}
