import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sum } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
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
  formatDate,
  formatDuration,
  formatEuros,
  formatQuantity,
  remainingCents,
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
import { PaymentBadge, PhaseBadge, StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import { ConfirmIconButton, DeleteIconButton } from "@/components/ui/icon-actions";
import {
  inputClass,
  labelClass,
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
  const t = await getTranslations("models");
  const tc = await getTranslations("common");
  const ts = await getTranslations("supplyStatus");
  const locale = await getLocale();

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
      <BackLink href="/models">{t("back")}</BackLink>
      <PageHeader
        title={
          <>
            {m.name}
            {m.company ? ` · ${m.company}` : ""}
          </>
        }
        subtitle={
          <>
            <span className="font-semibold text-brand">{clientName ?? t("ownProject")}</span>
            {" · "}
            {formatEuros(m.priceCents, locale)}
            <br />
            {m.paymentStatus === "deposit_paid" && (
              <>
                {t("depositSummary", {
                  deposit: formatEuros(m.depositCents, locale),
                  remaining: formatEuros(remainingCents(m.priceCents, m.depositCents), locale),
                })}
                <br />
              </>
            )}
            {t("dates", {
              requested: formatDate(m.requestedDate, locale),
              estimated: formatDate(m.estimatedDate, locale),
            })}
          </>
        }
        action={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <PhaseBadge phase={m.phase} />
            <PaymentBadge status={m.paymentStatus} priceCents={m.priceCents} depositCents={m.depositCents} />
            <PhaseProgress phase={m.phase} />
            <form action={createQuoteFromModel.bind(null, id)}>
              <button type="submit" className={secondaryButtonClass}>
                {t("createQuote")}
              </button>
            </form>
          </div>
        }
      />

      <Card>
        <CardTitle>{t("time.title", { total: formatDuration(Number(total ?? 0)) })}</CardTitle>

        <form action={addTimeEntry.bind(null, id)} className="flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            {t("time.date")}
            <input
              name="workedOn"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            {t("time.duration")}
            <input
              name="duration"
              placeholder={t("time.durationPlaceholder")}
              pattern="\d{1,2}:[0-5]\d"
              title={t("time.durationHint")}
              required
              className={`${inputClass} w-28`}
            />
          </label>
          <button type="submit" className={primaryButtonClass}>
            {tc("add")}
          </button>
        </form>

        <ul className="flex flex-col">
          {entries.length === 0 && (
            <li className="py-4 text-muted">{t("time.empty")}</li>
          )}
          {entries.map((e) => (
            <li
              key={e.id}
              className={`${listItemClass} flex items-center justify-between gap-3`}
            >
              <span className="font-semibold">
                {formatDate(e.workedOn, locale)} · {formatDuration(e.minutes)}
              </span>
              <form action={deleteTimeEntry.bind(null, id, e.id)}>
                <DeleteIconButton label={tc("delete")} />
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
        <CardTitle>{t("consumables.title", { total: formatEuros(consumablesTotalCents, locale) })}</CardTitle>

        {consumableOptions.length === 0 ? (
          <p className="text-muted">
            {t.rich("consumables.addFirst", {
              link: (chunks) => (
                <Link href="/consumables" className="font-semibold text-brand hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : (
          <form action={setModelConsumable.bind(null, id)} className="flex flex-wrap gap-3">
            <select name="consumableId" required aria-label={t("consumables.select")} className={inputClass}>
              {consumableOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.description}</option>
              ))}
            </select>
            <QuantityFields />
            <button type="submit" className={primaryButtonClass}>
              {tc("add")}
            </button>
          </form>
        )}

        <ul className="flex flex-col">
          {linkedRows.length === 0 && (
            <li className="py-4 text-muted">{t("consumables.empty")}</li>
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
                        ? t("consumables.quantityValue", { quantity: formatQuantity(Number(quantity)), count: Number(quantity) })
                        : t("consumables.quantityNotSet")}
                      {" · "}
                      {cost !== null
                        ? t("consumables.costWithUnit", {
                            cost: formatEuros(cost, locale),
                            unit: formatEuros(c.priceCents, locale),
                          })
                        : t("consumables.unitOnly", { unit: formatEuros(c.priceCents, locale) })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge variant={supplyStatusVariant(c.status)}>
                      {ts(c.status)}
                    </StatusBadge>
                    <form action={removeModelConsumable.bind(null, id, c.id)}>
                      <DeleteIconButton label={tc("remove")} />
                    </form>
                  </div>
                </div>
                <form
                  action={updateModelConsumableQuantity.bind(null, id, c.id)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <QuantityFields />
                  <ConfirmIconButton label={t("consumables.updateQuantity")} />
                </form>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
