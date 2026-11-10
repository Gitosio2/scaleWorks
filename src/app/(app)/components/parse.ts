import { getTranslations } from "next-intl/server";
import { capText, parseHttpUrl } from "@/lib/input";
import { parseEuros, type ActionT } from "@/lib/labels";
import { parseStockQuantity } from "@/lib/stock";

const MAX_TEXT = 500;
const MAX_URL = 2000;

function text(formData: FormData, key: string, max: number, t: ActionT) {
  return capText(String(formData.get(key) ?? "").trim() || null, max, t);
}

export async function parseComponent(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description", MAX_TEXT, t);
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    brand: text(formData, "brand", MAX_TEXT, t),
    reference: text(formData, "reference", MAX_TEXT, t),
    store: text(formData, "store", MAX_TEXT, t),
    url: parseHttpUrl(text(formData, "url", MAX_URL, t), t),
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    quantity: parseStockQuantity(String(formData.get("quantity") ?? ""), t),
  };
}
