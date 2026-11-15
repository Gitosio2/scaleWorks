import { collectionCondition, modelType } from "@/db/schema";
import { isCountryCode } from "./countries";
import { parseDate } from "./dates";
import { capText, parseYear } from "./input";
import { parseEuros, type ActionT } from "./labels";
import { parseTags } from "./tags";

const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 5000;

// Trimmed text from the form; empty -> null.
function text(formData: Pick<FormData, "get" | "getAll">, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: Pick<FormData, "get" | "getAll">, key: string, t: ActionT) {
  return capText(text(formData, key) || null, MAX_TEXT_LENGTH, t);
}

// One of an enum's values, or `fallback` when the field is empty. Anything else throws.
function enumValue<T extends string>(raw: string, values: readonly T[], fallback: T | null, error: () => Error) {
  if (!raw) return fallback;
  if (!(values as readonly string[]).includes(raw)) throw error();
  return raw as T;
}

// Turns the create form into the insert payload for `collectionItems` (without the
// owner). Throws translated errors like the model actions do. `now` stamps the
// estimated value, so the caller passes it (and tests can fix it).
export function parseCollectionItem(formData: Pick<FormData, "get" | "getAll">, t: ActionT, now: Date) {
  const brand = text(formData, "brand");
  if (!brand) throw new Error(t("brandRequired"));
  const name = text(formData, "name");
  if (!name) throw new Error(t("nameRequired"));

  const type = enumValue(text(formData, "type"), modelType.enumValues, null, () => new Error(t("invalidType")));

  const country = text(formData, "country") || null;
  if (country !== null && !isCountryCode(country)) throw new Error(t("invalidCountry"));

  const notes = text(formData, "notes") || null;
  if (notes !== null && notes.length > MAX_NOTES_LENGTH) throw new Error(t("notesTooLong"));

  const purchaseDate = parseDate(text(formData, "purchaseDate"), t);
  const soldDate = parseDate(text(formData, "soldDate"), t);
  if (purchaseDate !== null && soldDate !== null && soldDate < purchaseDate) {
    throw new Error(t("soldBeforePurchase"));
  }
  const soldPriceCents = parseEuros(text(formData, "soldPrice"), t);
  if (soldPriceCents !== null && soldDate === null) throw new Error(t("soldPriceNeedsDate"));

  const estimatedValueCents = parseEuros(text(formData, "estimatedValue"), t);

  return {
    brand,
    name,
    company: optionalText(formData, "company", t),
    country,
    manufacturer: optionalText(formData, "manufacturer", t),
    reference: optionalText(formData, "reference", t),
    type,
    tags: parseTags(formData.getAll("tags").map(String), type, t),
    year: parseYear(text(formData, "year"), t, now),
    customized: formData.get("customized") === "on",
    condition: enumValue(
      text(formData, "condition"),
      collectionCondition.enumValues,
      "new",
      () => new Error(t("invalidCondition")),
    ) as (typeof collectionCondition.enumValues)[number],
    purchasePriceCents: parseEuros(text(formData, "purchasePrice"), t),
    purchaseDate,
    estimatedValueCents,
    estimatedValueAt: estimatedValueCents !== null ? now : null,
    soldPriceCents,
    soldDate,
    notes,
  };
}
