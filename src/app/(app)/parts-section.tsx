import { supplyStatus } from "@/db/schema";
import type { parts } from "@/db/schema";
import { formatEuros, supplyStatusLabels } from "@/lib/labels";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  inputClass,
  labelClass,
  linkActionClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";

type Part = typeof parts.$inferSelect;

// Shared by models and quotes. The owner-specific server actions come in as
// props, already bound to the owning model or quote.
export function PartsSection({
  parts: rows,
  add,
  updateStatus,
  remove,
}: {
  parts: Part[];
  add: (formData: FormData) => Promise<void>;
  updateStatus: (partId: string, formData: FormData) => Promise<void>;
  remove: (partId: string) => Promise<void>;
}) {
  const totalCents = rows.reduce((acc, p) => acc + (p.priceCents ?? 0), 0);
  const pair = `${labelClass} min-w-40 flex-1`;

  return (
    <Card>
      <CardTitle>Parts: {formatEuros(totalCents)}</CardTitle>

      <form action={add} className="flex flex-col gap-3">
        <label className={labelClass}>
          Description
          <input name="description" placeholder="Description" required className={inputClass} />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className={pair}>
            Brand
            <input name="brand" placeholder="Brand" className={inputClass} />
          </label>
          <label className={pair}>
            Reference
            <input name="reference" placeholder="Reference" className={inputClass} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className={pair}>
            Price (€)
            <input name="price" inputMode="decimal" placeholder="Price (€)" className={inputClass} />
          </label>
          <label className={pair}>
            Store
            <input name="store" placeholder="Store" className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Store link
          <input name="url" type="url" placeholder="Store link (https://...)" className={inputClass} />
        </label>
        <label className={labelClass}>
          Status
          <select name="status" defaultValue="to_order" className={inputClass}>
            {supplyStatus.enumValues.map((s) => (
              <option key={s} value={s}>{supplyStatusLabels[s]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${primaryButtonClass} self-start`}>
          Add part
        </button>
      </form>

      <ul className="flex flex-col">
        {rows.length === 0 && <li className="py-4 text-muted">No parts yet.</li>}
        {rows.map((p) => (
          <li key={p.id} className={`${listItemClass} flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{p.description}</p>
                <p className="text-[13px] text-muted">
                  {[p.brand, p.reference].filter(Boolean).join(" · ") || "—"}
                  {" · "}
                  {formatEuros(p.priceCents)}
                </p>
                <p className="text-[13px] text-muted">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                      {p.store ?? "Store link"}
                    </a>
                  ) : (
                    (p.store ?? "No store")
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge variant={supplyStatusVariant(p.status)}>
                  {supplyStatusLabels[p.status]}
                </StatusBadge>
                <form action={remove.bind(null, p.id)}>
                  <button type="submit" className={dangerActionClass}>Delete</button>
                </form>
              </div>
            </div>
            <form action={updateStatus.bind(null, p.id)} className="flex flex-wrap items-center gap-2">
              <select name="status" defaultValue={p.status} aria-label="Status" className={`${inputClass} text-sm`}>
                {supplyStatus.enumValues.map((s) => (
                  <option key={s} value={s}>{supplyStatusLabels[s]}</option>
                ))}
              </select>
              <button type="submit" className={linkActionClass}>Update status</button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
