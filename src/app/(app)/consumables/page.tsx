import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { consumables, supplyStatus } from "@/db/schema";
import { formatEuros, supplyStatusLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  inputClass,
  linkActionClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import {
  createConsumable,
  deleteConsumable,
  updateConsumableStatus,
} from "./actions";
import { ConsumableFields } from "./consumable-fields";

export default async function ConsumablesPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(consumables)
    .where(eq(consumables.userId, user.id))
    .orderBy(consumables.description);

  return (
    <>
      <PageHeader title="Consumables" subtitle="Paints, glues and other supplies." />

      <Card>
        <CardTitle>Add consumable</CardTitle>
        <form action={createConsumable} className="flex flex-col gap-3">
          <ConsumableFields />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Add consumable
          </button>
        </form>
      </Card>

      <Card>
        <ul className="flex flex-col">
          {rows.length === 0 && <li className="text-muted">No consumables yet.</li>}
          {rows.map((c) => (
            <li key={c.id} className={`${listItemClass} flex flex-col gap-2`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold">{c.description}</p>
                  <p className="text-[13px] text-muted">
                    {[c.store, c.reference].filter(Boolean).join(" · ") || "—"}
                    {" · "}
                    {formatEuros(c.priceCents)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={supplyStatusVariant(c.status)}>
                    {supplyStatusLabels[c.status]}
                  </StatusBadge>
                  <Link href={`/consumables/${c.id}/edit`} className={linkActionClass}>Edit</Link>
                  <form action={deleteConsumable.bind(null, c.id)}>
                    <button type="submit" className={dangerActionClass}>Delete</button>
                  </form>
                </div>
              </div>
              <form action={updateConsumableStatus.bind(null, c.id)} className="flex flex-wrap items-center gap-2">
                <select name="status" defaultValue={c.status} aria-label="Status" className={`${inputClass} text-sm`}>
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
    </>
  );
}
