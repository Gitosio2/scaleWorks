import { modelPhase } from "@/db/schema";
import { phaseLabels } from "@/lib/labels";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  name?: string;
  company?: string | null;
  clientId?: string | null;
  priceCents?: number | null;
  phase?: (typeof modelPhase.enumValues)[number];
  requestedDate?: string | null;
  estimatedDate?: string | null;
};

export function ModelFields({
  clients,
  defaults = {},
}: {
  clients: { id: string; name: string }[];
  defaults?: Defaults;
}) {
  return (
    <>
      <label className={labelClass}>
        Model name
        <input name="name" placeholder="Model name" required defaultValue={defaults.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        Company
        <input
          name="company"
          placeholder="Company of the real subject (optional)"
          defaultValue={defaults.company ?? ""}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Client
        <select name="clientId" defaultValue={defaults.clientId ?? ""} className={inputClass}>
          <option value="">— No client (own project) —</option>
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
        Phase
        <select name="phase" defaultValue={defaults.phase ?? "not_started"} className={inputClass}>
          {modelPhase.enumValues.map((p) => (
            <option key={p} value={p}>{phaseLabels[p]}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Requested date (from client)
        <input name="requestedDate" type="date" defaultValue={defaults.requestedDate ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Estimated date
        <input name="estimatedDate" type="date" defaultValue={defaults.estimatedDate ?? ""} className={inputClass} />
      </label>
    </>
  );
}
