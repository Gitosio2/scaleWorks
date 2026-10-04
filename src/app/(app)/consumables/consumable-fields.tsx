import { supplyStatus } from "@/db/schema";
import { supplyStatusLabels } from "@/lib/labels";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  description?: string;
  store?: string | null;
  reference?: string | null;
  priceCents?: number | null;
  status?: (typeof supplyStatus.enumValues)[number];
};

export function ConsumableFields({ defaults = {} }: { defaults?: Defaults }) {
  return (
    <>
      <label className={labelClass}>
        Description
        <input name="description" placeholder="Description" required defaultValue={defaults.description} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${labelClass} min-w-40 flex-1`}>
          Store
          <input name="store" placeholder="Store" defaultValue={defaults.store ?? ""} className={inputClass} />
        </label>
        <label className={`${labelClass} min-w-40 flex-1`}>
          Reference
          <input name="reference" placeholder="Reference (optional)" defaultValue={defaults.reference ?? ""} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Price (€)
        <input
          name="price"
          inputMode="decimal"
          placeholder="Price (€)"
          defaultValue={defaults.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Status
        <select name="status" defaultValue={defaults.status ?? "to_order"} className={inputClass}>
          {supplyStatus.enumValues.map((s) => (
            <option key={s} value={s}>{supplyStatusLabels[s]}</option>
          ))}
        </select>
      </label>
    </>
  );
}
