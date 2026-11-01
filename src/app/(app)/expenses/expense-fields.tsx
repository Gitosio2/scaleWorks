import { useTranslations } from "next-intl";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  description?: string;
  store?: string | null;
  priceCents?: number | null;
  status?: "ordered" | "in_hand" | "to_order";
  paid?: boolean;
};

// Fields of a loose expense (a part with no model). "To order" is left out: it
// would not count as owed until it is bought.
export function ExpenseFields({ defaults = {} }: { defaults?: Defaults }) {
  const tc = useTranslations("common");
  const t = useTranslations("expenses");
  const ts = useTranslations("supplyStatus");
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
        <select
          name="status"
          defaultValue={defaults.status === "in_hand" ? "in_hand" : "ordered"}
          className={inputClass}
        >
          <option value="ordered">{ts("ordered")}</option>
          <option value="in_hand">{ts("in_hand")}</option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2">
        <input type="checkbox" name="paid" defaultChecked={defaults.paid ?? false} className="size-4 accent-brand" />
        {t("paid")}
      </label>
    </>
  );
}
