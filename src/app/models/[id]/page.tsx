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
  phaseLabels,
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
import { PartsSection } from "@/app/parts-section";
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
  const input = "rounded border px-3 py-2";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <Link href="/models" className="text-sm underline">
          ← Models
        </Link>
        <h1 className="text-2xl font-semibold">
          {m.name}
          {m.company ? ` · ${m.company}` : ""}
        </h1>
        <p className="text-sm text-zinc-500">
          {clientName ?? "Own project"} · {phaseLabels[m.phase]} ·{" "}
          {formatEuros(m.priceCents)}
        </p>
        <p className="text-sm text-zinc-500">
          Requested: {m.requestedDate ?? "—"} · Estimated:{" "}
          {m.estimatedDate ?? "—"}
        </p>
        <form action={createQuoteFromModel.bind(null, id)} className="pt-2">
          <button
            type="submit"
            className="rounded border px-3 py-2 text-sm"
          >
            Create quote from this model
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">
          Time: {formatDuration(Number(total ?? 0))}
        </h2>

        <form action={addTimeEntry.bind(null, id)} className="flex gap-3">
          <input
            name="workedOn"
            type="date"
            required
            defaultValue={today}
            className={input}
          />
          <input
            name="duration"
            placeholder="hh:mm"
            pattern="\d{1,2}:[0-5]\d"
            title="Format hh:mm, e.g. 01:30"
            required
            className={`${input} w-24`}
          />
          <button
            type="submit"
            className="rounded bg-foreground px-3 py-2 text-background"
          >
            Add
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {entries.length === 0 && (
            <li className="text-zinc-500">No time logged yet.</li>
          )}
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <span>
                {e.workedOn} · {formatDuration(e.minutes)}
              </span>
              <form action={deleteTimeEntry.bind(null, id, e.id)}>
                <button type="submit" className="text-sm text-red-600 underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <PartsSection
        parts={partRows}
        add={addPart.bind(null, id)}
        updateStatus={updatePartStatus.bind(null, id)}
        remove={deletePart.bind(null, id)}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">
          Consumables: {formatEuros(consumablesTotalCents)}
        </h2>

        {consumableOptions.length === 0 ? (
          <p className="text-zinc-500">
            Add consumables first in{" "}
            <Link href="/consumables" className="underline">Consumables</Link>.
          </p>
        ) : (
          <form action={setModelConsumable.bind(null, id)} className="flex flex-wrap gap-3">
            <select name="consumableId" required className={input}>
              {consumableOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.description}</option>
              ))}
            </select>
            <QuantityFields />
            <button type="submit" className="rounded bg-foreground px-3 py-2 text-background">
              Add
            </button>
          </form>
        )}

        <ul className="flex flex-col gap-2">
          {linkedRows.length === 0 && (
            <li className="text-zinc-500">No consumables linked yet.</li>
          )}
          {linkedRows.map(({ consumable: c, quantity }) => {
            const cost = consumableCost(c.priceCents, quantity);
            return (
              <li key={c.id} className="flex flex-col gap-2 rounded border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.description}</p>
                    <p className="text-sm text-zinc-500">
                      {quantity !== null
                        ? `${formatQuantity(Number(quantity))} unit`
                        : "Quantity not set"}
                      {" · "}
                      {cost !== null
                        ? `${formatEuros(cost)} (unit ${formatEuros(c.priceCents)})`
                        : `unit ${formatEuros(c.priceCents)}`}
                      {" · "}
                      {supplyStatusLabels[c.status]}
                    </p>
                  </div>
                  <form action={removeModelConsumable.bind(null, id, c.id)}>
                    <button type="submit" className="text-sm text-red-600 underline">
                      Remove
                    </button>
                  </form>
                </div>
                <form
                  action={updateModelConsumableQuantity.bind(null, id, c.id)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <QuantityFields />
                  <button type="submit" className="text-sm underline">
                    Update quantity
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
