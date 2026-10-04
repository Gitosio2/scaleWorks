import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  consumables,
  modelConsumables,
  models,
  parts,
  timeEntries,
} from "@/db/schema";
import {
  formatDuration,
  formatEuros,
  formatQuantity,
  supplyStatusLabels,
} from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { addTimeEntry, deleteTimeEntry } from "./actions";
import { createQuoteFromModel } from "./create-quote-action";
import {
  removeModelConsumable,
  setModelConsumable,
  updateModelConsumableQuantity,
} from "./consumable-actions";
import { addPart, deletePart, updatePartStatus } from "./part-actions";
import { Card, CardTitle } from "@/components/ui/card";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { PhaseProgress } from "@/components/ui/phase-progress";
import { PhaseBadge, StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  inputClass,
  labelClass,
  linkActionClass,
  listItemClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import { PartsSection } from "@/app/(app)/parts-section";
import { QuantityFields } from "./quantity-fields";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [row] = await db
    .select({ model: models, clientName: clients.name })
    .from(models)
    .leftJoin(clients, eq(models.clientId, clients.id))
    .where(and(eq(models.id, id), eq(models.userId, user.id)));
  if (!row) notFound();
  const { model: m, clientName } = row;

  const [entries, [{ total }], partRows, linkedRows, consumableOptions] =
    await Promise.all([
    db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.modelId, id), eq(timeEntries.userId, user.id)))
      .orderBy(desc(timeEntries.workedOn), desc(timeEntries.id)),
    db
      .select({ total: sum(timeEntries.minutes) })
      .from(timeEntries)
      .where(and(eq(timeEntries.modelId, id), eq(timeEntries.userId, user.id))),
    db
      .select()
      .from(parts)
      .where(and(eq(parts.modelId, id), eq(parts.userId, user.id)))
      .orderBy(parts.description),
    db
      .select({ consumable: consumables, quantity: modelConsumables.quantity })
      .from(modelConsumables)
      .innerJoin(consumables, eq(modelConsumables.consumableId, consumables.id))
      .where(
        and(eq(modelConsumables.modelId, id), eq(consumables.userId, user.id)),
      )
      .orderBy(consumables.description),
    db
      .select({ id: consumables.id, description: consumables.description })
      .from(consumables)
      .where(eq(consumables.userId, user.id))
      .orderBy(consumables.description),
  ]);
  // Cost of a consumable on this model = unit price x fraction used.
  const consumableCost = (priceCents: number | null, quantity: string | null) =>
    priceCents !== null && quantity !== null
      ? Math.round(priceCents * Number(quantity))
      : null;
  const consumablesTotalCents = linkedRows.reduce(
    (acc, r) => acc + (consumableCost(r.consumable.priceCents, r.quantity) ?? 0),
    0,
  );

  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Madrid",
  });
  return (
    <>
      <BackLink href="/models">← Models</BackLink>
      <PageHeader
        title={
          <>
            {m.name}
            {m.company ? ` · ${m.company}` : ""}
          </>
        }
        subtitle={
          <>
            <span className="font-semibold text-brand">{clientName ?? "Own project"}</span>
            {" · "}
            {formatEuros(m.priceCents)}
            <br />
            Requested: {m.requestedDate ?? "—"} · Estimated: {m.estimatedDate ?? "—"}
          </>
        }
        action={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <PhaseBadge phase={m.phase} />
            <PhaseProgress phase={m.phase} />
            <form action={createQuoteFromModel.bind(null, id)}>
              <button type="submit" className={secondaryButtonClass}>
                Create quote from this model
              </button>
            </form>
          </div>
        }
      />

      <Card>
        <CardTitle>Time: {formatDuration(Number(total ?? 0))}</CardTitle>

        <form action={addTimeEntry.bind(null, id)} className="flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            Date
            <input
              name="workedOn"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Duration
            <input
              name="duration"
              placeholder="hh:mm"
              pattern="\d{1,2}:[0-5]\d"
              title="Format hh:mm, e.g. 01:30"
              required
              className={`${inputClass} w-28`}
            />
          </label>
          <button type="submit" className={primaryButtonClass}>
            Add
          </button>
        </form>

        <ul className="flex flex-col">
          {entries.length === 0 && (
            <li className="py-4 text-muted">No time logged yet.</li>
          )}
          {entries.map((e) => (
            <li
              key={e.id}
              className={`${listItemClass} flex items-center justify-between gap-3`}
            >
              <span className="font-semibold">
                {e.workedOn} · {formatDuration(e.minutes)}
              </span>
              <form action={deleteTimeEntry.bind(null, id, e.id)}>
                <button type="submit" className={dangerActionClass}>
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <PartsSection
        parts={partRows}
        add={addPart.bind(null, id)}
        updateStatus={updatePartStatus.bind(null, id)}
        remove={deletePart.bind(null, id)}
      />

      <Card>
        <CardTitle>Consumables: {formatEuros(consumablesTotalCents)}</CardTitle>

        {consumableOptions.length === 0 ? (
          <p className="text-muted">
            Add consumables first in{" "}
            <Link href="/consumables" className="font-semibold text-brand hover:underline">
              Consumables
            </Link>
            .
          </p>
        ) : (
          <form action={setModelConsumable.bind(null, id)} className="flex flex-wrap gap-3">
            <select name="consumableId" required aria-label="Consumable" className={inputClass}>
              {consumableOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.description}</option>
              ))}
            </select>
            <QuantityFields />
            <button type="submit" className={primaryButtonClass}>
              Add
            </button>
          </form>
        )}

        <ul className="flex flex-col">
          {linkedRows.length === 0 && (
            <li className="py-4 text-muted">No consumables linked yet.</li>
          )}
          {linkedRows.map(({ consumable: c, quantity }) => {
            const cost = consumableCost(c.priceCents, quantity);
            return (
              <li key={c.id} className={`${listItemClass} flex flex-col gap-2`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{c.description}</p>
                    <p className="text-[13px] text-muted">
                      {quantity !== null
                        ? `${formatQuantity(Number(quantity))} unit`
                        : "Quantity not set"}
                      {" · "}
                      {cost !== null
                        ? `${formatEuros(cost)} (unit ${formatEuros(c.priceCents)})`
                        : `unit ${formatEuros(c.priceCents)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge variant={supplyStatusVariant(c.status)}>
                      {supplyStatusLabels[c.status]}
                    </StatusBadge>
                    <form action={removeModelConsumable.bind(null, id, c.id)}>
                      <button type="submit" className={dangerActionClass}>
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
                <form
                  action={updateModelConsumableQuantity.bind(null, id, c.id)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <QuantityFields />
                  <button type="submit" className={linkActionClass}>
                    Update quantity
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
