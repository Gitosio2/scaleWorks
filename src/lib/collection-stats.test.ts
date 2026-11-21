import { describe, expect, it } from "vitest";
import { collectionStats, type StatsRow } from "./collection-stats";

let seq = 0;
const row = (over: Partial<StatsRow> = {}): StatsRow => ({
  id: `id-${++seq}`,
  brand: "Iveco",
  name: "S-way",
  manufacturer: null,
  type: null,
  country: null,
  condition: "new",
  customized: false,
  gift: false,
  purchasePriceCents: null,
  estimatedValueCents: null,
  purchaseDate: null,
  soldPriceCents: null,
  soldDate: null,
  ...over,
});

const stats = (rows: StatsRow[], options: Parameters<typeof collectionStats>[1] = { locale: "en" }) =>
  collectionStats(rows, options);

describe("collectionStats: empty collection", () => {
  it("returns zeros, nulls and empty lists without dividing by zero", () => {
    const s = stats([]);
    expect(s.models).toBe(0);
    expect(s.totalCostCents).toBe(0);
    expect(s.pricedCount).toBe(0);
    expect(s.averageCents).toBeNull();
    expect(s.topBrands).toEqual([]);
    expect(s.topManufacturers).toEqual([]);
    expect(s.topTypes).toEqual([]);
    expect(s.topCountries).toEqual([]);
    expect(s.conditions).toEqual([]);
    expect(s.giftCount).toBe(0);
    expect(s.customizedCount).toBe(0);
    expect(s.mostExpensive).toBeNull();
    expect(s.purchaseYears).toEqual([]);
    expect(s.sold).toEqual({ count: 0, profitCents: null });
  });
});

describe("collectionStats: what is in the collection", () => {
  it("counts only the items that are not sold", () => {
    const s = stats([row(), row(), row({ soldDate: "2026-02-01" })]);
    expect(s.models).toBe(2);
  });

  it("keeps sold items out of cost, ranks and the other figures", () => {
    const s = stats([
      row({ brand: "Scania", purchasePriceCents: 9000, gift: true, customized: true, country: "SE" }),
      row({
        brand: "Volvo",
        purchasePriceCents: 5000,
        soldDate: "2026-02-01",
        soldPriceCents: 7000,
        customized: true,
        gift: true,
        country: "SE",
        manufacturer: "Herpa",
        type: "truck",
      }),
    ]);
    expect(s.models).toBe(1);
    expect(s.totalCostCents).toBe(0);
    expect(s.topBrands.map((b) => b.label)).toEqual(["Scania"]);
    expect(s.topManufacturers).toEqual([]);
    expect(s.topTypes).toEqual([]);
    expect(s.topCountries).toHaveLength(1);
    expect(s.giftCount).toBe(1);
    expect(s.customizedCount).toBe(1);
  });

  it("reports the sold items on their own, with the profit of those that have both prices", () => {
    const s = stats([
      row({ purchasePriceCents: 4000, soldDate: "2026-02-01", soldPriceCents: 6500 }),
      row({ purchasePriceCents: 5000, soldDate: "2026-03-01", soldPriceCents: 4000 }),
      row({ purchasePriceCents: 3000, soldDate: "2026-03-02" }),
      row({ purchasePriceCents: null, soldDate: "2026-03-03", soldPriceCents: 9000 }),
    ]);
    expect(s.sold).toEqual({ count: 4, profitCents: 1500 });
  });

  it("has no profit when no sold item has both prices", () => {
    const s = stats([row({ soldDate: "2026-02-01" })]);
    expect(s.sold).toEqual({ count: 1, profitCents: null });
  });

  it("shows an empty collection with only sold items as zero models", () => {
    const s = stats([row({ soldDate: "2026-02-01" })]);
    expect(s.models).toBe(0);
    expect(s.averageCents).toBeNull();
  });
});

describe("collectionStats: cost and average", () => {
  it("sums the purchase prices", () => {
    const s = stats([row({ purchasePriceCents: 1000 }), row({ purchasePriceCents: 2550 })]);
    expect(s.totalCostCents).toBe(3550);
  });

  it("averages over the items that have a price, not over all of them", () => {
    const s = stats([row({ purchasePriceCents: 1000 }), row({ purchasePriceCents: 3000 }), row(), row()]);
    expect(s.models).toBe(4);
    expect(s.pricedCount).toBe(2);
    expect(s.averageCents).toBe(2000);
  });

  it("rounds the average to whole cents", () => {
    const s = stats([row({ purchasePriceCents: 100 }), row({ purchasePriceCents: 100 }), row({ purchasePriceCents: 101 })]);
    expect(s.averageCents).toBe(100);
    const t = stats([row({ purchasePriceCents: 100 }), row({ purchasePriceCents: 101 })]);
    expect(t.averageCents).toBe(101);
  });

  it("has no average when nothing has a price", () => {
    const s = stats([row(), row()]);
    expect(s.totalCostCents).toBe(0);
    expect(s.pricedCount).toBe(0);
    expect(s.averageCents).toBeNull();
  });

  it("counts a price of zero as a price", () => {
    const s = stats([row({ purchasePriceCents: 0 }), row({ purchasePriceCents: 2000 })]);
    expect(s.pricedCount).toBe(2);
    expect(s.averageCents).toBe(1000);
  });

  it("does not count gifts as cost or in the average, even with a price", () => {
    const s = stats([
      row({ purchasePriceCents: 4000 }),
      row({ purchasePriceCents: 9900, gift: true }),
      row({ gift: true }),
    ]);
    expect(s.models).toBe(3);
    expect(s.giftCount).toBe(2);
    expect(s.totalCostCents).toBe(4000);
    expect(s.pricedCount).toBe(1);
    expect(s.averageCents).toBe(4000);
  });
});

describe("collectionStats: ranked brands and manufacturers", () => {
  it("groups ignoring case and edge spaces, and ranks by count", () => {
    const s = stats([
      row({ brand: "MAN" }),
      row({ brand: " man " }),
      row({ brand: "Man" }),
      row({ brand: "Scania" }),
    ]);
    expect(s.topBrands).toEqual([
      { key: "man", label: "MAN", count: 3, share: 0.75 },
      { key: "scania", label: "Scania", count: 1, share: 0.25 },
    ]);
  });

  it("labels a group with its most used spelling, the first alphabetically on a tie", () => {
    expect(stats([row({ brand: "Man" }), row({ brand: "MAN" }), row({ brand: "MAN" })]).topBrands[0].label).toBe("MAN");
    expect(stats([row({ brand: "Man" }), row({ brand: "MAN" })]).topBrands[0].label).toBe("MAN");
  });

  it("keeps only the top three", () => {
    const s = stats([
      ...Array.from({ length: 4 }, () => row({ brand: "A" })),
      ...Array.from({ length: 3 }, () => row({ brand: "B" })),
      ...Array.from({ length: 2 }, () => row({ brand: "C" })),
      row({ brand: "D" }),
    ]);
    expect(s.topBrands.map((b) => b.label)).toEqual(["A", "B", "C"]);
  });

  it("honours a different limit", () => {
    const s = stats([row({ brand: "A" }), row({ brand: "B" }), row({ brand: "C" })], { locale: "en", top: 2 });
    expect(s.topBrands).toHaveLength(2);
  });

  it("breaks ties alphabetically, ignoring case and accents", () => {
    const s = stats([
      row({ brand: "Volvo" }),
      row({ brand: "Ëlan" }),
      row({ brand: "Dennis" }),
      row({ brand: "azure" }),
      row({ brand: "Fendt" }),
    ]);
    expect(s.topBrands.map((b) => b.label)).toEqual(["azure", "Dennis", "Ëlan"]);
  });

  it("does not depend on the order of the rows", () => {
    const rows = [row({ brand: "B" }), row({ brand: "A" }), row({ brand: "a" }), row({ brand: "B" })];
    expect(stats([...rows].reverse()).topBrands).toEqual(stats(rows).topBrands);
  });

  it("skips empty and missing manufacturers, but shares stay relative to all the models", () => {
    const s = stats([
      row({ manufacturer: "Herpa" }),
      row({ manufacturer: " herpa" }),
      row({ manufacturer: "  " }),
      row({ manufacturer: null }),
    ]);
    expect(s.topManufacturers).toEqual([{ key: "herpa", label: "Herpa", count: 2, share: 0.5 }]);
  });

  it("does not turn an item without brand into a group", () => {
    const s = stats([row({ brand: "  " }), row({ brand: "Iveco" })]);
    expect(s.topBrands.map((b) => b.key)).toEqual(["iveco"]);
  });
});

describe("collectionStats: ranked types and countries", () => {
  it("ranks types by count and labels them with the callback", () => {
    const s = stats(
      [row({ type: "truck" }), row({ type: "crane" }), row({ type: "truck" }), row({ type: null })],
      { locale: "en", labels: { type: (v) => `T:${v}` } },
    );
    expect(s.topTypes).toEqual([
      { key: "truck", label: "T:truck", count: 2, share: 0.5 },
      { key: "crane", label: "T:crane", count: 1, share: 0.25 },
    ]);
  });

  it("falls back to the key without a label callback", () => {
    expect(stats([row({ type: "truck" })]).topTypes[0].label).toBe("truck");
  });

  it("keeps country codes as they are and breaks ties by the displayed name", () => {
    const names: Record<string, string> = { ES: "España", DE: "Alemania", FR: "Francia", IT: "Italia" };
    const s = stats(
      [row({ country: "ES" }), row({ country: "DE" }), row({ country: "FR" }), row({ country: "IT" })],
      { locale: "es", labels: { country: (c) => names[c] } },
    );
    expect(s.topCountries.map((c) => [c.key, c.label])).toEqual([
      ["DE", "Alemania"],
      ["ES", "España"],
      ["FR", "Francia"],
    ]);
  });
});

describe("collectionStats: other figures", () => {
  it("lists the conditions present, in the order of the enum, with their share", () => {
    const s = stats([
      row({ condition: "damaged" }),
      row({ condition: "new" }),
      row({ condition: "damaged" }),
      row({ condition: "normal" }),
    ]);
    expect(s.conditions).toEqual([
      { key: "new", count: 1, share: 0.25 },
      { key: "normal", count: 1, share: 0.25 },
      { key: "damaged", count: 2, share: 0.5 },
    ]);
  });

  it("finds the most expensive piece among the bought ones", () => {
    const s = stats([
      row({ id: "a", brand: "Iveco", name: "S-way", purchasePriceCents: 8000 }),
      row({ id: "b", brand: "MAN", name: "TGX", purchasePriceCents: 12000 }),
      row({ id: "c", brand: "Volvo", name: "FH", purchasePriceCents: 99900, gift: true }),
      row({ id: "d", brand: "Scania", name: "R500", purchasePriceCents: 50000, soldDate: "2026-01-01" }),
    ]);
    expect(s.mostExpensive).toEqual({ id: "b", brand: "MAN", name: "TGX", priceCents: 12000 });
  });

  it("breaks a tie for the most expensive by brand, model and id", () => {
    const rows = [
      row({ id: "2", brand: "MAN", name: "TGX", purchasePriceCents: 5000 }),
      row({ id: "1", brand: "Iveco", name: "S-way", purchasePriceCents: 5000 }),
    ];
    expect(stats(rows).mostExpensive?.id).toBe("1");
    expect(stats([...rows].reverse()).mostExpensive?.id).toBe("1");
  });

  it("has no most expensive piece when nothing costs anything", () => {
    expect(stats([row(), row({ purchasePriceCents: 0 })]).mostExpensive).toBeNull();
  });

  it("counts the customized items", () => {
    expect(stats([row({ customized: true }), row(), row({ customized: true })]).customizedCount).toBe(2);
  });

  it("groups the purchases per year, most recent first, with what was spent", () => {
    const s = stats([
      row({ purchaseDate: "2024-03-10", purchasePriceCents: 2000 }),
      row({ purchaseDate: "2024-11-02", purchasePriceCents: 3000 }),
      row({ purchaseDate: "2025-01-05", purchasePriceCents: 1000, gift: true }),
      row({ purchaseDate: "2023-06-01" }),
      row({ purchaseDate: null, purchasePriceCents: 500 }),
    ]);
    expect(s.purchaseYears).toEqual([
      { year: 2025, count: 1, spentCents: 0 },
      { year: 2024, count: 2, spentCents: 5000 },
      { year: 2023, count: 1, spentCents: 0 },
    ]);
  });

  it("keeps the most recent years only", () => {
    const rows = [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => row({ purchaseDate: `${y}-05-05` }));
    expect(stats(rows).purchaseYears.map((y) => y.year)).toEqual([2025, 2024, 2023, 2022, 2021]);
    expect(stats(rows, { locale: "en", years: 2 }).purchaseYears.map((y) => y.year)).toEqual([2025, 2024]);
  });
});
