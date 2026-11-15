export type RowMetaItem = {
  manufacturer: string | null;
  company: string | null;
  country: string | null;
  year: number | null;
  purchasePriceCents: number | null;
};

export type MetaPart =
  | { kind: "text"; text: string }
  | { kind: "country"; code: string; name: string };

// The muted line under a collection row's title: manufacturer, company, country
// and year, in that order, skipping the empty ones. The country is kept apart from
// plain text because it is drawn with a flag.
export function rowMeta(item: Omit<RowMetaItem, "purchasePriceCents">, countryName: (code: string) => string): MetaPart[] {
  const parts: MetaPart[] = [];
  for (const text of [item.manufacturer, item.company]) {
    if (text && text.trim()) parts.push({ kind: "text", text: text.trim() });
  }
  if (item.country) parts.push({ kind: "country", code: item.country, name: countryName(item.country) });
  if (item.year !== null) parts.push({ kind: "text", text: String(item.year) });
  return parts;
}

// The purchase price is shown only when there is one (a price of 0 is a price).
export function hasPurchasePrice({ purchasePriceCents }: Pick<RowMetaItem, "purchasePriceCents">) {
  return purchasePriceCents !== null;
}
