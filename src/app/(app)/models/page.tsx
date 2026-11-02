import Link from "next/link";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  clients,
  consumables,
  modelConsumables,
  modelPhase,
  models,
  modelType,
  parts,
  paymentStatus,
} from "@/db/schema";
import { formatDate, formatEuros } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import {
  ascNullsLast,
  containsPattern,
  descNullsLast,
  enumParam,
  textParam,
  uuidParam,
  type SearchParams,
} from "@/lib/list-filters";
import { pageWindow, parsePage } from "@/lib/pagination";
import { canHold } from "@/lib/payment-hold";
import { requireUser } from "@/lib/session";
import { stalledCutoff } from "@/lib/stalled";
import { Card } from "@/components/ui/card";
import { CreateModal } from "@/components/ui/create-modal";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { PhaseProgress } from "@/components/ui/phase-progress";
import { HoldBadge, PaymentBadge, PhaseBadge } from "@/components/ui/status-badge";
import { DeleteIconButton, EditIconLink, HoldIconButton } from "@/components/ui/icon-actions";
import {
  listItemClass,
} from "@/components/ui/styles";
import { createModel, deleteModel, setPaymentHold } from "./actions";
import { ModelFields } from "./model-fields";

// "brand name" as shown on screen, for searching and sorting by what the user sees.
const fullTitle = sql`lower(concat_ws(' ', ${models.brand}, ${models.name}))`;

const sorts = {
  newest: { order: [desc(models.createdAt)] },
  oldest: { order: [asc(models.createdAt)] },
  name: { order: [asc(fullTitle)] },
  price_desc: { order: [descNullsLast(models.priceCents)] },
  price_asc: { order: [ascNullsLast(models.priceCents)] },
  requested: { order: [ascNullsLast(models.requestedDate)] },
  estimated: { order: [ascNullsLast(models.estimatedDate)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

// Phase filter: a phase, or a group the dashboard cards count: "active" = started
// and not finished, "stalled" = not started for over STALLED_MONTHS months.
const phaseFilters = [...modelPhase.enumValues, "active", "stalled"] as const;

// Payment filter: a payment status, or "pending" = still owed (not paid, with a
// price), which is what the dashboard's pending-payment card counts, or "on_hold"
// = paused by hand because the client has not paid.
const paymentFilters = [...paymentStatus.enumValues, "pending", "on_hold"] as const;

// "open" (the default) hides models that are both finished and paid in full.
const scopes = ["open", "all"] as const;

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("models");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("phase");
  const tpay = await getTranslations("paymentStatus");
  const ttype = await getTranslations("modelType");
  const th = await getTranslations("paymentHold");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const client = uuidParam(sp, "client") ?? (textParam(sp, "client") === "none" ? "none" : null);
  const company = textParam(sp, "company");
  const phase = enumParam(sp, "phase", phaseFilters);
  const payment = enumParam(sp, "payment", paymentFilters);
  const type = enumParam(sp, "type", modelType.enumValues);
  const scope = textParam(sp, "scope") === "all" ? "all" : "open";
  const sort = enumParam(sp, "sort", sortKeys) ?? "newest";

  const conditions: Array<SQL | undefined> = [
    eq(models.userId, user.id),
    q
      ? or(
          ilike(fullTitle, containsPattern(q)),
          ilike(models.company, containsPattern(q)),
          ilike(clients.name, containsPattern(q)),
        )
      : undefined,
    client === "none" ? isNull(models.clientId) : client ? eq(models.clientId, client) : undefined,
    company ? eq(models.company, company) : undefined,
    type ? eq(models.type, type) : undefined,
    phase === "active"
      ? notInArray(models.phase, ["not_started", "finished"])
      : phase === "stalled"
        ? and(
            eq(models.phase, "not_started"),
            lt(models.createdAt, stalledCutoff(new Date())),
            isNull(models.paymentHoldAt),
          )
        : phase
          ? eq(models.phase, phase)
          : undefined,
    payment === "pending"
      ? and(ne(models.paymentStatus, "paid"), isNotNull(models.priceCents))
      : payment === "on_hold"
        ? isNotNull(models.paymentHoldAt)
        : payment
          ? eq(models.paymentStatus, payment)
          : undefined,
    scope === "open"
      ? or(ne(models.phase, "finished"), ne(models.paymentStatus, "paid"))
      : undefined,
  ];
  const activeCount = [q, client, company, type, phase, payment, scope === "open"].filter(Boolean).length;
  const hasUserFilters = [q, client, company, type, phase, payment].some(Boolean);

  // Total matches, so the requested page can be clamped to the last one.
  const [{ total }] = await db
    .select({ total: count() })
    .from(models)
    .leftJoin(clients, eq(models.clientId, clients.id))
    .where(and(...conditions));
  const win = pageWindow(parsePage(sp), total);

  const [rows, clientRows, companyRows] = await Promise.all([
    db
      .select({
        model: models,
        clientName: clients.name,
        // What the model costs: its parts plus the consumables used on it (unit
        // price x fraction used), the same figures its detail page totals.
        costCents: sql<number>`(
          coalesce((select sum(${parts.priceCents}) from ${parts} where ${parts.modelId} = ${models.id}), 0)
          + coalesce((
              select sum(round(${consumables.priceCents} * ${modelConsumables.quantity}))
              from ${modelConsumables}
              inner join ${consumables} on ${consumables.id} = ${modelConsumables.consumableId}
              where ${modelConsumables.modelId} = ${models.id}
            ), 0)
        )::int`,
      })
      .from(models)
      .leftJoin(clients, eq(models.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(models.id))
      .limit(win.limit)
      .offset(win.offset),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
    db
      .selectDistinct({ company: models.company })
      .from(models)
      .where(and(eq(models.userId, user.id), isNotNull(models.company)))
      .orderBy(models.company),
  ]);

  return (
    <>
      <PageHeader title={tn("models")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createModel}>
        <ModelFields clients={clientRows} />
      </CreateModal>

      <ListFilters action="/models" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="scope"
          label={t("show")}
          defaultValue={scope}
          options={scopes.map((s) => ({ value: s, label: t(`scope.${s}`) }))}
          allLabel={null}
        />
        <FilterSelect
          name="client"
          label={tc("client")}
          defaultValue={client ?? ""}
          options={[
            { value: "none", label: t("ownProject") },
            ...clientRows.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          name="company"
          label={tc("company")}
          defaultValue={company}
          options={companyRows.map((r) => ({ value: r.company!, label: r.company! }))}
        />
        <FilterSelect
          name="phase"
          label={t("phase")}
          defaultValue={phase ?? ""}
          options={[
            { value: "active", label: t("phaseActive") },
            { value: "stalled", label: t("phaseStalled") },
            ...modelPhase.enumValues.map((p) => ({ value: p as string, label: tp(p) })),
          ]}
        />
        <FilterSelect
          name="type"
          label={t("type")}
          defaultValue={type ?? ""}
          options={modelType.enumValues.map((v) => ({ value: v, label: ttype(v) }))}
        />
        <FilterSelect
          name="payment"
          label={t("payment")}
          defaultValue={payment ?? ""}
          options={[
            ...paymentStatus.enumValues.map((p) => ({ value: p as string, label: tpay(p) })),
            { value: "pending", label: t("paymentPending") },
            { value: "on_hold", label: t("paymentOnHold") },
          ]}
        />
        <FilterSelect
          name="sort"
          label={tc("sortBy")}
          defaultValue={sort}
          options={sortKeys.map((k) => ({ value: k, label: t(`sort.${k}`) }))}
          allLabel={null}
        />
      </ListFilters>

      <Card className="py-0!">
        <ul className="flex flex-col">
          {rows.length === 0 && (
            <li className="text-muted">
              {hasUserFilters
                ? t("emptyFiltered")
                : scope === "open"
                  ? t("emptyOpen")
                  : t("empty")}
            </li>
          )}
          {rows.map(({ model: m, clientName, costCents }) => {
            // Profit = what the model is sold for minus what it cost; unknown without a price.
            const profitCents = m.priceCents !== null ? m.priceCents - costCents : null;
            // Finished and paid in full: the dates no longer matter, so they are hidden.
            const done = m.phase === "finished" && m.paymentStatus === "paid";
            const badges = (
              <div className="flex flex-wrap items-center gap-2">
                <PhaseBadge phase={m.phase} />
                <PaymentBadge status={m.paymentStatus} priceCents={m.priceCents} depositCents={m.depositCents} />
                {m.paymentHoldAt && <HoldBadge />}
              </div>
            );
            return (
            <li key={m.id} className={`${listItemClass} flex flex-col gap-3`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/models/${m.id}`} className="font-bold hover:underline">
                    {modelTitle(m.brand, m.name)}
                  </Link>
                  <p className="text-[13px] font-semibold text-brand">{clientName ?? t("ownProject")}</p>
                  <p className="text-[13px] text-muted">
                    {m.type ? `${ttype(m.type)} · ` : ""}
                    {m.company ? `${m.company} · ` : ""}
                    {formatEuros(m.priceCents, locale)}
                  </p>
                  {!done && (
                    <p className="text-[13px] text-muted">
                      {t("dates", {
                        requested: formatDate(m.requestedDate, locale),
                        estimated: formatDate(m.estimatedDate, locale),
                      })}
                    </p>
                  )}
                </div>
                <div className="-mt-1 flex min-w-0 flex-col items-end gap-1">
                  <div className="flex shrink-0 items-center">
                    {(m.paymentHoldAt || canHold(m.paymentStatus)) && (
                      <form action={setPaymentHold.bind(null, m.id, !m.paymentHoldAt)}>
                        <HoldIconButton
                          held={!!m.paymentHoldAt}
                          label={m.paymentHoldAt ? th("resume") : th("hold")}
                        />
                      </form>
                    )}
                    <EditIconLink href={`/models/${m.id}/edit`} label={tc("edit")} />
                    <form action={deleteModel.bind(null, m.id)}>
                      <DeleteIconButton label={tc("delete")} />
                    </form>
                  </div>
                  <div className="flex flex-col items-end gap-2 pt-0.5">
                    {badges}
                    <PhaseProgress phase={m.phase} />
                  </div>
                </div>
              </div>
              {/* Full width under the columns: beside the badges it ran under them on a phone. */}
              {profitCents !== null && (
                <p className="text-[13px] text-muted">
                  {t("profit")}{" "}
                  <span className={`font-semibold ${profitCents < 0 ? "text-danger" : "text-ok"}`}>
                    {profitCents > 0 ? "+" : ""}
                    {formatEuros(profitCents, locale)}
                  </span>
                  {" · "}
                  {t("profitBreakdown", {
                    income: formatEuros(m.priceCents, locale),
                    cost: formatEuros(costCents, locale),
                  })}
                </p>
              )}
            </li>
            );
          })}
        </ul>
      </Card>

      <Pagination pathname="/models" searchParams={sp} pageInfo={win} total={total} />
    </>
  );
}
