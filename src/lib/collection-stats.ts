import { collectionCondition } from "@/db/schema";
import { isSold, profitCents, type CollectionItemInput } from "./collection";

// The columns of a collection item the dashboard figures are made from (the
// prices and the sold date come from CollectionItemInput, like isSold and profitCents).
export type StatsRow = CollectionItemInput & {
  id: string;
  brand: string;
  name: string;
  manufacturer: string | null;
  type: string | null;
  country: string | null;
  condition: string;
  customized: boolean;
  gift: boolean;
  // Calendar date, "YYYY-MM-DD".
  purchaseDate: string | null;
};

// One line of a ranking. `key` is what the collection filters take (brand and
// manufacturer lowercased and trimmed, the type and country as stored), `label`
// what to show. `share` is count / models in the collection, from 0 to 1.
export type RankedEntry = { key: string; label: string; count: number; share: number };

export type StatsOptions = {
  // Language used to break ties alphabetically.
  locale: string;
  // Length of each ranking.
  top?: number;
  // How many purchase years are listed, the most recent first.
  years?: number;
  // Displayed names of the types and countries; they also decide the order of ties.
  labels?: { type?: (value: string) => string; country?: (code: string) => string };
};

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Most used spelling of a group; on a tie, the first one in plain order.
function mostUsed(spellings: Map<string, number>) {
  return [...spellings].sort(([a, countA], [b, countB]) => countB - countA || compareText(a, b))[0][0];
}

// Counts the values and returns the biggest groups: by count, then alphabetically
// by label without case or accents. With `fold`, "Man" and "MAN" are one group.
function rank(
  values: ReadonlyArray<string | null>,
  total: number,
  limit: number,
  collator: Intl.Collator,
  { fold, label }: { fold: boolean; label?: (key: string) => string },
): RankedEntry[] {
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const raw of values) {
    const value = raw?.trim() ?? "";
    if (!value) continue;
    const key = fold ? value.toLowerCase() : value;
    const group = groups.get(key) ?? { count: 0, spellings: new Map() };
    group.count += 1;
    group.spellings.set(value, (group.spellings.get(value) ?? 0) + 1);
    groups.set(key, group);
  }
  return [...groups]
    .map(([key, group]) => ({ key, count: group.count, label: label?.(key) ?? mostUsed(group.spellings) }))
    .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label) || compareText(a.key, b.key))
    .slice(0, limit)
    .map((entry) => ({ ...entry, share: entry.count / total }));
}

// The dashboard figures of the user's collection.
//
// - "In the collection" means not sold (see isSold): sold items count in none of
//   the figures except `sold`, which reports them on their own.
// - A gift was not bought, so it never adds to the cost or the average, whatever
//   price it carries. Items without a purchase price are left out of both too;
//   a price of zero is a price.
// - The average divides by the items that have a price, never by all of them.
export function collectionStats(rows: readonly StatsRow[], options: StatsOptions) {
  const { locale, top = 3, years = 5, labels } = options;
  const collator = new Intl.Collator(locale, { sensitivity: "base" });

  const owned = rows.filter((r) => !isSold(r));
  const sold = rows.filter((r) => isSold(r));
  const models = owned.length;

  const priced = owned.filter((r) => !r.gift && r.purchasePriceCents !== null);
  const totalCostCents = priced.reduce((sum, r) => sum + r.purchasePriceCents!, 0);
  const averageCents = priced.length > 0 ? Math.round(totalCostCents / priced.length) : null;

  const [mostExpensive] = priced
    .filter((r) => r.purchasePriceCents! > 0)
    .sort(
      (a, b) =>
        b.purchasePriceCents! - a.purchasePriceCents! ||
        collator.compare(a.brand, b.brand) ||
        collator.compare(a.name, b.name) ||
        compareText(a.id, b.id),
    );

  const byYear = new Map<number, { count: number; spentCents: number }>();
  for (const r of owned) {
    const year = r.purchaseDate ? Number(r.purchaseDate.slice(0, 4)) : NaN;
    if (!Number.isInteger(year)) continue;
    const entry = byYear.get(year) ?? { count: 0, spentCents: 0 };
    entry.count += 1;
    if (!r.gift && r.purchasePriceCents !== null) entry.spentCents += r.purchasePriceCents;
    byYear.set(year, entry);
  }

  const profits = sold.map((r) => profitCents(r)).filter((p): p is number => p !== null);

  return {
    models,
    totalCostCents,
    pricedCount: priced.length,
    averageCents,
    topBrands: rank(owned.map((r) => r.brand), models, top, collator, { fold: true }),
    topManufacturers: rank(owned.map((r) => r.manufacturer), models, top, collator, { fold: true }),
    topTypes: rank(owned.map((r) => r.type), models, top, collator, { fold: false, label: labels?.type }),
    topCountries: rank(owned.map((r) => r.country), models, top, collator, { fold: false, label: labels?.country }),
    conditions: collectionCondition.enumValues
      .map((key) => ({ key, count: owned.filter((r) => r.condition === key).length }))
      .filter((c) => c.count > 0)
      .map((c) => ({ ...c, share: c.count / models })),
    giftCount: owned.filter((r) => r.gift).length,
    customizedCount: owned.filter((r) => r.customized).length,
    mostExpensive: mostExpensive
      ? { id: mostExpensive.id, brand: mostExpensive.brand, name: mostExpensive.name, priceCents: mostExpensive.purchasePriceCents! }
      : null,
    purchaseYears: [...byYear]
      .sort(([a], [b]) => b - a)
      .slice(0, years)
      .map(([year, { count, spentCents }]) => ({ year, count, spentCents })),
    sold: {
      count: sold.length,
      profitCents: profits.length > 0 ? profits.reduce((sum, p) => sum + p, 0) : null,
    },
  };
}

export type CollectionStats = ReturnType<typeof collectionStats>;
