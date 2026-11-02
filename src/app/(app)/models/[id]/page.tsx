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
import { consumableCost } from "@/lib/consumable-cost";
import { todayInMadrid } from "@/lib/dates";
import { modelTitle } from "@/lib/model-title";
import { requireUser } from "@/lib/session";
import { addTimeEntry, deleteTimeEntry, updateModelNotes } from "./actions";
import { createQuoteFromModel } from "./create-quote-action";
import {
  removeModelConsumable,
  setModelConsumable,
  updateModelConsumableQuantity,
} from "./consumable-actions";
import { addPart, deletePart, updatePart, updatePartStatus } from "./part-actions";
import { setPartPaid } from "../../expenses/actions";
import { profitability } from "@/lib/profitability";
import { Card, CardTitle, CollapsibleCard } from "@/components/ui/card";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { PhaseProgress } from "@/components/ui/phase-progress";
import { PaymentBadge, PhaseBadge, StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import {
  ConfirmIconButton,
  DeleteIconButton,
  EditIconLink,
  QuoteIconButton,
} from "@/components/ui/icon-actions";
import {
  inputClass,
  labelClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { PartsSection } from "@/app/(app)/parts-section";
import { PhotosSection } from "./photos-section";
import { QuantityFields } from "./quantity-fields";

function ProfitStat({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xl font-bold tracking-tight ${valueClass}`}>{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}

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
  const ttype = await getTranslations("modelType");
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
      .where(and(eq(consumables.userId, user.id), eq(consumables.active, true)))
      .orderBy(consumables.description),
  ]);
  const consumablesTotalCents = linkedRows.reduce(
    (acc, r) => acc + (consumableCost(r.consumable.priceCents, r.quantity) ?? 0),
    0,
  );

  const partsTotalCents = partRows.reduce((acc, p) => acc + (p.priceCents ?? 0), 0);
  const totalMinutes = Number(total ?? 0);
  const costCents = partsTotalCents + consumablesTotalCents;
  const { profitCents, centsPerHour } = profitability({
    priceCents: m.priceCents,
    costCents,
    minutes: totalMinutes,
  });

  const today = todayInMadrid();
  const done = m.phase === "finished" && m.paymentStatus === "paid";
  const badges = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <PhaseBadge phase={m.phase} />
      <PaymentBadge status={m.paymentStatus} priceCents={m.priceCents} depositCents={m.depositCents} />
    </div>
  );
  const actions = (
    <div className="flex items-center gap-2">
      <form action={createQuoteFromModel.bind(null, id)}>
        <QuoteIconButton label={t("createQuote")} />
      </form>
      <EditIconLink href={`/models/${id}/edit`} label={tc("edit")} />
    </div>
  );
  return (
    <>
      <BackLink href="/models">{t("back")}</BackLink>
      <PageHeader
        title={
          <>
            {modelTitle(m.brand, m.name)}
            {m.company ? ` · ${m.company}` : ""}
          </>
        }
        subtitle={
          <>
            <span className="font-semibold text-brand">{clientName ?? t("ownProject")}</span>
            {" · "}
            {m.type ? `${ttype(m.type)} · ` : ""}
            {formatEuros(m.priceCents, locale)}
            {m.paymentStatus === "deposit_paid" && (
              <>
                <br />
                {t("depositSummary", {
                  deposit: formatEuros(m.depositCents, locale),
                  remaining: formatEuros(remainingCents(m.priceCents, m.depositCents), locale),
                })}
              </>
            )}
            {!done && (
              <>
                <br />
                {t("dates", {
                  requested: formatDate(m.requestedDate, locale),
                  estimated: formatDate(m.estimatedDate, locale),
                })}
              </>
            )}
          </>
        }
        action={
          <div className="flex flex-col items-end gap-2">
            {badges}
            <PhaseProgress phase={m.phase} />
            {actions}
          </div>
        }
      />

      <PhotosSection
        modelId={id}
        modelName={modelTitle(m.brand, m.name)}
        userId={user.id}
        published={m.published}
        finished={m.phase === "finished"}
      />

      {profitCents !== null && (
        <Card>
          <CardTitle>{t("profitability.title")}</CardTitle>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <ProfitStat label={t("profitability.price")} value={formatEuros(m.priceCents, locale)} />
            <ProfitStat label={t("profitability.parts")} value={formatEuros(partsTotalCents, locale)} />
            <ProfitStat label={t("profitability.consumables")} value={formatEuros(consumablesTotalCents, locale)} />
            <ProfitStat
              label={t("profitability.profit")}
              value={formatEuros(profitCents, locale)}
              valueClass={profitCents < 0 ? "text-danger" : "text-ok"}
            />
            <ProfitStat label={t("profitability.time")} value={formatDuration(totalMinutes)} />
            {centsPerHour !== null && (
              <ProfitStat
                label={t("profitability.perHour")}
                value={t("profitability.perHourUnit", { amount: formatEuros(centsPerHour, locale) })}
                valueClass={centsPerHour < 0 ? "text-danger" : "text-ok"}
              />
            )}
          </div>
          {centsPerHour === null && (
            <p className="text-[13px] text-muted">{t("profitability.noTime")}</p>
          )}
        </Card>
      )}

      <CollapsibleCard title={t("time.title", { total: formatDuration(totalMinutes) })}>

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
      </CollapsibleCard>

      <PartsSection
        parts={partRows}
        add={addPart.bind(null, id)}
        update={updatePart.bind(null, id)}
        updateStatus={updatePartStatus.bind(null, id)}
        remove={deletePart.bind(null, id)}
        setPaid={setPartPaid}
      />

      <CollapsibleCard title={t("consumables.title", { total: formatEuros(consumablesTotalCents, locale) })}>

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
                    {c.active ? (
                      <StatusBadge variant={supplyStatusVariant(c.status)}>
                        {ts(c.status)}
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="mute">{t("consumables.inactive")}</StatusBadge>
                    )}
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
      </CollapsibleCard>

      <CollapsibleCard title={t("notes.title")} defaultOpen={!!m.notes}>
        <form action={updateModelNotes.bind(null, id)} className="flex flex-col gap-3">
          <textarea
            name="notes"
            rows={3}
            maxLength={5000}
            defaultValue={m.notes ?? ""}
            aria-label={t("notes.label")}
            placeholder={t("notes.placeholder")}
            className={`${inputClass} py-2`}
          />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            {tc("save")}
          </button>
        </form>
      </CollapsibleCard>
    </>
  );
}
