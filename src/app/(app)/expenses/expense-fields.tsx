import { useTranslations } from "next-intl";
import { expenseStatus } from "@/db/schema";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  description?: string;
  store?: string | null;
  priceCents?: number | null;
  status?: (typeof expenseStatus.enumValues)[number];
};

export function ExpenseFields({ defaults = {} }: { defaults?: Defaults }) {
  const tc = useTranslations("common");
  const t = useTranslations("expenses");
  const ts = useTranslations("expenseStatus");
  return (
    <>
      <label className={labelClass}>
        {tc("description")}
        <input name="description" placeholder={t("descriptionPlaceholder")} required defaultValue={defaults.description} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${labelClass} min-w-40 flex-1`}>
          {tc("store")}
          <input name="store" placeholder={tc("store")} defaultValue={defaults.store ?? ""} className={inputClass} />
        </label>
        <label className={`${labelClass} min-w-40 flex-1`}>
          {tc("price")}
          <input
            name="price"
            inputMode="decimal"
            placeholder={tc("moneyPlaceholder")}
            defaultValue={defaults.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
            className={inputClass}
          />
        </label>
      </div>
      <label className={labelClass}>
        {tc("status")}
        <select name="status" defaultValue={defaults.status ?? "ordered"} className={inputClass}>
          {expenseStatus.enumValues.map((s) => (
            <option key={s} value={s}>{ts(s)}</option>
          ))}
        </select>
      </label>
    </>
  );
}
