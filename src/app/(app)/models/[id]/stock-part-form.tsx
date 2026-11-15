"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SubmitButton } from "@/components/ui/submit-button";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/styles";
import { formatEuros } from "@/lib/labels";
import { partCostCents } from "@/lib/part-cost";
import type { Locale } from "@/i18n/config";

export type StockOption = {
  id: string;
  name: string;
  priceCents: number | null;
  quantity: number;
};

// Picks a stock component and a quantity. The total shown is the same figure the
// part will cost on the model: unit price x quantity.
export function StockPartForm({
  options,
  action,
}: {
  options: StockOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("models.stockParts");
  const locale = useLocale() as Locale;
  const firstAvailable = options.find((o) => o.quantity > 0);
  const [componentId, setComponentId] = useState(firstAvailable?.id ?? "");
  const [quantity, setQuantity] = useState("1");

  const selected = options.find((o) => o.id === componentId);
  const units = /^\d+$/.test(quantity.trim()) ? Number(quantity) : 0;
  const total = selected
    ? partCostCents({ priceCents: null, stockUnitPriceCents: selected.priceCents, quantity: units })
    : 0;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className={`${labelClass} min-w-0 max-w-full flex-1`}>
          {t("select")}
          <select
            name="componentId"
            required
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
            className={`${inputClass} max-w-full min-w-0`}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id} disabled={o.quantity === 0}>
                {o.quantity === 0
                  ? t("optionEmpty", { name: o.name, unit: formatEuros(o.priceCents, locale) })
                  : t("option", {
                      name: o.name,
                      unit: formatEuros(o.priceCents, locale),
                      available: o.quantity,
                    })}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t("quantity")}
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={selected?.quantity}
            step={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${inputClass} w-28`}
          />
        </label>
        <SubmitButton className={primaryButtonClass}>{t("add")}</SubmitButton>
      </div>
      <p className="text-[13px] text-muted" aria-live="polite">
        {t("total", { total: formatEuros(total, locale) })}
      </p>
    </form>
  );
}
