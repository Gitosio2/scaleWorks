export type CollectionItemInput = {
  purchasePriceCents: number | null;
  estimatedValueCents: number | null;
  soldPriceCents: number | null;
  soldDate: string | null;
};

// "Sold" is never stored as a status: an item is sold when it has a sold date.
export function isSold({ soldDate }: CollectionItemInput) {
  return soldDate !== null;
}

// Profit = sale price - purchase price. Unknown unless the item is sold and both
// prices are filled in.
export function profitCents(item: CollectionItemInput) {
  if (!isSold(item) || item.soldPriceCents === null || item.purchasePriceCents === null) return null;
  return item.soldPriceCents - item.purchasePriceCents;
}

// When the estimated value was last set. Clearing it clears the date; a new or
// changed value stamps `now`; an unchanged value keeps the stored date.
export function nextEstimatedValueAt(
  prevCents: number | null,
  prevAt: Date | null,
  nextCents: number | null,
  now: Date,
) {
  if (nextCents === null) return null;
  return nextCents === prevCents && prevAt !== null ? prevAt : now;
}
