import type { ActionT } from "./labels";

// Stock counts are small whole numbers; the cap just rejects typos.
const MAX_STOCK = 1_000_000;

// "" -> 0, "12" -> 12. Negative, fractional or non-numeric input throws.
export function parseStockQuantity(raw: string, t: ActionT) {
  const value = raw.trim();
  if (!value) return 0;
  if (!/^\d+$/.test(value)) throw new Error(t("invalidStockQuantity"));
  const n = Number(value);
  if (n > MAX_STOCK) throw new Error(t("invalidStockQuantity"));
  return n;
}

// Applies a +/- step to a stock count; it can never go below zero.
export function adjustQuantity(current: number, delta: number) {
  return Math.max(0, current + delta);
}
