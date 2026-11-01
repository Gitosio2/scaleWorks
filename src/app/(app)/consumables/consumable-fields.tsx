import { useTranslations } from "next-intl";
import { supplyStatus } from "@/db/schema";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  description?: string;
  store?: string | null;
  reference?: string | null;
  priceCents?: number | null;
  status?: (typeof supplyStatus.enumValues)[number];
};

export function ConsumableFields({ defaults = {} }: { defaults?: Defaults }) {
  const t = useTranslations("consumables");
  const tc = useTranslations("common");
  const ts = useTranslations("supplyStatus");
  return (
    <>
      <label className={labelClass}>
        {tc("description")}
        <input name="description" placeholder={tc("description")} required defaultValue={defaults.description} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${labelClass} min-w-40 flex-1`}>
          {tc("store")}
          <input name="store" placeholder={tc("store")} defaultValue={defaults.store ?? ""} className={inputClass} />
        </label>
        <label className={`${labelClass} min-w-40 flex-1`}>
          {tc("reference")}
          <input name="reference" placeholder={t("referencePlaceholder")} defaultValue={defaults.reference ?? ""} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        {tc("price")}
        <input
          name="price"
          inputMode="decimal"
          placeholder={tc("price")}
          defaultValue={defaults.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {tc("status")}
        <select name="status" defaultValue={defaults.status ?? "to_order"} className={inputClass}>
          {supplyStatus.enumValues.map((s) => (
            <option key={s} value={s}>{ts(s)}</option>
          ))}
        </select>
      </label>
    </>
  );
}
