import { getTranslations } from "next-intl/server";
import { parseEuros, type ActionT } from "@/lib/labels";

// A loose expense is a part with no model and no quote. It only makes sense once
// bought, so it can be ordered or in hand ("to order" would never show as owed).
const LOOSE_STATUSES = ["ordered", "in_hand"] as const;
type LooseStatus = (typeof LOOSE_STATUSES)[number];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function parseStatus(value: string, t: ActionT): LooseStatus {
  if (!(LOOSE_STATUSES as readonly string[]).includes(value)) {
    throw new Error(t("invalidStatus"));
  }
  return value as LooseStatus;
}

// Everything but the status, for forms whose status is edited elsewhere.
export async function parseLooseFields(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    store: text(formData, "store"),
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    // An unchecked checkbox is simply absent from the form data.
    paid: formData.get("paid") === "on",
  };
}

export async function parseLoosePart(formData: FormData) {
  const t = await getTranslations("actionErrors");
  return {
    ...(await parseLooseFields(formData)),
    status: parseStatus(String(formData.get("status")), t),
  };
}
