import { useTranslations } from "next-intl";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  description?: string;
  brand?: string | null;
  reference?: string | null;
  store?: string | null;
  url?: string | null;
  priceCents?: number | null;
  quantity?: number;
};

export function ComponentFields({ defaults = {} }: { defaults?: Defaults }) {
  const t = useTranslations("components");
  const tc = useTranslations("common");
  return (
    <>
      <label className={labelClass}>
        {tc("description")}
        <input name="description" placeholder={tc("description")} required defaultValue={defaults.description} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${labelClass} min-w-40 flex-1`}>
          {tc("brand")}
          <input name="brand" placeholder={tc("brand")} defaultValue={defaults.brand ?? ""} className={inputClass} />
        </label>
        <label className={`${labelClass} min-w-40 flex-1`}>
          {tc("reference")}
          <input name="reference" placeholder={t("referencePlaceholder")} defaultValue={defaults.reference ?? ""} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        {tc("store")}
        <input name="store" placeholder={tc("store")} defaultValue={defaults.store ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("url")}
        <input name="url" type="url" placeholder={t("urlPlaceholder")} defaultValue={defaults.url ?? ""} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${labelClass} min-w-40 flex-1`}>
          {t("unitPrice")}
          <input
            name="price"
            inputMode="decimal"
            placeholder={tc("moneyPlaceholder")}
            defaultValue={defaults.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} min-w-40 flex-1`}>
          {t("quantity")}
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={defaults.quantity ?? 0}
            className={inputClass}
          />
        </label>
      </div>
    </>
  );
}
