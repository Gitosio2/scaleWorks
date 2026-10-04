import { quoteStatus } from "@/db/schema";
import { quoteStatusLabels } from "@/lib/labels";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  title?: string;
  clientId?: string | null;
  priceCents?: number | null;
  status?: (typeof quoteStatus.enumValues)[number];
};

export function QuoteFields({
  clients,
  defaults = {},
}: {
  clients: { id: string; name: string }[];
  defaults?: Defaults;
}) {
  return (
    <>
      <label className={labelClass}>
        Title
        <input name="title" placeholder="Quote title" required defaultValue={defaults.title} className={inputClass} />
      </label>
      <label className={labelClass}>
        Client
        <select name="clientId" defaultValue={defaults.clientId ?? ""} className={inputClass}>
          <option value="">— No client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Price (€)
        <input
          name="price"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaults.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Status
        <select name="status" defaultValue={defaults.status ?? "open"} className={inputClass}>
          {quoteStatus.enumValues.map((s) => (
            <option key={s} value={s}>{quoteStatusLabels[s]}</option>
          ))}
        </select>
      </label>
    </>
  );
}
