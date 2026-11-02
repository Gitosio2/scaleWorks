// Cost of a consumable on a model = unit price x fraction used. The product is
// trimmed to 9 decimals before rounding so a float artefact (25 x 0.58 = 14.4999...)
// rounds like the exact decimal the models list computes in SQL (14.5 -> 15).
export function consumableCost(
  priceCents: number | null,
  quantity: string | null,
) {
  return priceCents !== null && quantity !== null
    ? Math.round(Number((priceCents * Number(quantity)).toFixed(9)))
    : null;
}
