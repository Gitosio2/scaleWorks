import Link from "next/link";
import { and, asc, eq, isNotNull, isNull, lt, lte, ne, notInArray, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  consumables,
  modelConsumables,
  models,
  parts,
  quotes,
  timeEntries,
} from "@/db/schema";
import { formatDate, formatEuros } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import { todayInMadrid } from "@/lib/dates";
import { aggregateProfitability } from "@/lib/profitability";
import { stalledCutoff } from "@/lib/stalled";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeVariant } from "@/components/ui/status-badge";

const DAY_MS = 86_400_000;
// Rows shown per list; the rest is summarized as "and N more".
const MAX_ROWS = 5;
// A model is "active" once started and until it is finished.
const INACTIVE_PHASES = ["not_started", "finished"] as const;
const ACTIVE = sql`${models.phase} not in ('not_started', 'finished')`;

function Stat({
  value,
  label,
  valueClass = "",
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-3xl font-bold tracking-tight ${valueClass}`}>{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}

// Card title that links to the matching section, pre-filtered where it helps.
function CardLinkTitle({ title, href }: { title: string; href: string }) {
  return (
    <CardTitle>
      <Link href={href} className="group inline-flex items-center gap-1.5 hover:text-brand">
        {title}
        <span aria-hidden className="text-brand transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </Link>
    </CardTitle>
  );
}

function RowList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col divide-y divide-line-soft">{children}</ul>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <li className="flex items-center justify-between gap-3 py-2">{children}</li>;
}

const rowLinkClass = "min-w-0 truncate font-semibold text-brand hover:underline";

export default async function Home() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");
  const th = await getTranslations("home");
  const locale = await getLocale();

  const now = new Date();
  const today = todayInMadrid(now);
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCMonth(horizon.getUTCMonth() + 2);
  const deadlineCutoff = horizon.toISOString().slice(0, 10);
  const staleCutoff = stalledCutoff(now);

  const [
    [stats],
    deadlines,
    openQuotes,
    stalled,
    [partsSpent],
    [consumablesSpent],
    [unpaidExpenses],
    finishedRows,
  ] = await Promise.all([
    db
      .select({
        activeCount: sql<number>`count(*) filter (where ${ACTIVE})::int`,
        activeCents: sql<number>`coalesce(sum(${models.priceCents}) filter (where ${ACTIVE}), 0)::int`,
        // Of that value, what has not come in yet: price minus any deposit, for active
        // models not paid in full. This is the money still to be received.
        activeToCollectCents: sql<number>`coalesce(sum(${models.priceCents} - coalesce(${models.depositCents}, 0)) filter (where ${ACTIVE} and ${models.paymentStatus} <> 'paid' and ${models.priceCents} is not null), 0)::int`,
        finishedCount: sql<number>`count(*) filter (where ${models.phase} = 'finished')::int`,
        // Priced models not started yet and not paid in full (e.g. a converted quote).
        // They are neither active nor finished, so without this figure they would be
        // missing from both cards.
        notStartedToCollectCents: sql<number>`coalesce(sum(${models.priceCents} - coalesce(${models.depositCents}, 0)) filter (where ${models.phase} = 'not_started' and ${models.paymentStatus} <> 'paid' and ${models.priceCents} is not null), 0)::int`,
        // Finished models not paid in full, with a price: price minus any deposit. The
        // ones still in progress are counted on the active work card instead.
        pendingCount: sql<number>`count(*) filter (where ${models.phase} = 'finished' and ${models.paymentStatus} <> 'paid' and ${models.priceCents} is not null)::int`,
        pendingCents: sql<number>`coalesce(sum(${models.priceCents} - coalesce(${models.depositCents}, 0)) filter (where ${models.phase} = 'finished' and ${models.paymentStatus} <> 'paid' and ${models.priceCents} is not null), 0)::int`,
        // Money actually received: the full price once paid, the deposit before that.
        incomeCents: sql<number>`coalesce(sum(case ${models.paymentStatus} when 'paid' then ${models.priceCents} when 'deposit_paid' then ${models.depositCents} else 0 end), 0)::int`,
      })
      .from(models)
      .where(eq(models.userId, user.id)),
    // Active models due within two months, overdue ones included.
    db
      .select({
        id: models.id,
        brand: models.brand,
        name: models.name,
        estimatedDate: models.estimatedDate,
      })
      .from(models)
      .where(
        and(
          eq(models.userId, user.id),
          notInArray(models.phase, [...INACTIVE_PHASES]),
          isNotNull(models.estimatedDate),
          lte(models.estimatedDate, deadlineCutoff),
        ),
      )
      .orderBy(asc(models.estimatedDate), asc(models.id)),
    // Rejecting a quote is the existing "rejected" status, so open = awaiting a decision.
    db
      .select({ id: quotes.id, title: quotes.title, createdAt: quotes.createdAt })
      .from(quotes)
      .where(and(eq(quotes.userId, user.id), eq(quotes.status, "open")))
      .orderBy(asc(quotes.createdAt), asc(quotes.id)),
    db
      .select({ id: models.id, brand: models.brand, name: models.name, createdAt: models.createdAt })
      .from(models)
      .where(
        and(
          eq(models.userId, user.id),
          eq(models.phase, "not_started"),
          lt(models.createdAt, staleCutoff),
        ),
      )
      .orderBy(asc(models.createdAt), asc(models.id)),
    // Spent = bought (ordered or in hand), not merely planned. Parts on a model or
    // loose ones count; parts on a quote are an estimate for work not yet accepted.
    db
      .select({ cents: sql<number>`coalesce(sum(${parts.priceCents}), 0)::int` })
      .from(parts)
      .where(
        and(eq(parts.userId, user.id), isNull(parts.quoteId), ne(parts.status, "to_order")),
      ),
    db
      .select({ cents: sql<number>`coalesce(sum(${consumables.priceCents}), 0)::int` })
      .from(consumables)
      .where(and(eq(consumables.userId, user.id), ne(consumables.status, "to_order"))),
    // Still to pay (the Pending expenses list): bought parts, of a model or loose, not marked paid.
    db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${parts.priceCents}), 0)::int`,
      })
      .from(parts)
      .where(
        and(
          eq(parts.userId, user.id),
          isNull(parts.quoteId),
          ne(parts.status, "to_order"),
          eq(parts.paid, false),
        ),
      ),
    // Price, cost (parts + consumables used) and tracked time of each finished model,
    // the same figures its detail page shows.
    db
      .select({
        priceCents: models.priceCents,
        costCents: sql<number>`(
          coalesce((select sum(${parts.priceCents}) from ${parts} where ${parts.modelId} = ${models.id}), 0)
          + coalesce((
              select sum(round(${consumables.priceCents} * ${modelConsumables.quantity}))
              from ${modelConsumables}
              inner join ${consumables} on ${consumables.id} = ${modelConsumables.consumableId}
              where ${modelConsumables.modelId} = ${models.id}
            ), 0)
        )::int`,
        minutes: sql<number>`coalesce((select sum(${timeEntries.minutes}) from ${timeEntries} where ${timeEntries.modelId} = ${models.id}), 0)::int`,
      })
      .from(models)
      .where(and(eq(models.userId, user.id), eq(models.phase, "finished"))),
  ]);
  const expensesCents = partsSpent.cents + consumablesSpent.cents;
  const profit = aggregateProfitability(finishedRows);
  const balanceCents = stats.incomeCents - expensesCents;

  const daysUntil = (date: string) =>
    Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  const daysSince = (date: Date) => Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  const more = (total: number) =>
    total > MAX_ROWS ? (
      <p className="pt-2 text-[13px] text-muted">{t("andMore", { count: total - MAX_ROWS })}</p>
    ) : null;

  return (
    <>
      <PageHeader title={tn("home")} subtitle={th("subtitle")} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardLinkTitle title={t("activeTitle")} href="/models?phase=active&sort=estimated" />
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat value={stats.activeCount} label={t("activeCount", { count: stats.activeCount })} />
            <Stat value={formatEuros(stats.activeCents, locale)} label={t("activeAmount")} />
            <Stat
              value={formatEuros(stats.activeToCollectCents, locale)}
              valueClass={stats.activeToCollectCents > 0 ? "text-warn" : ""}
              label={t("activeToCollect")}
            />
            {stats.notStartedToCollectCents > 0 && (
              <Stat
                value={formatEuros(stats.notStartedToCollectCents, locale)}
                valueClass="text-warn"
                label={t("notStartedToCollect")}
              />
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-ink-2">{t("deadlinesTitle")}</h3>
            {deadlines.length === 0 ? (
              <p className="pt-2 text-muted">{t("deadlinesEmpty")}</p>
            ) : (
              <>
                <RowList>
                  {deadlines.slice(0, MAX_ROWS).map((m) => {
                    const days = daysUntil(m.estimatedDate!);
                    const variant: BadgeVariant = days < 0 ? "bad" : days <= 14 ? "warn" : "mute";
                    return (
                      <Row key={m.id}>
                        <Link href={`/models/${m.id}`} className={rowLinkClass}>
                          {modelTitle(m.brand, m.name)}
                        </Link>
                        <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <span className="text-[13px] text-muted">
                            {formatDate(m.estimatedDate, locale)}
                          </span>
                          <StatusBadge variant={variant}>
                            {days < 0
                              ? t("overdue", { days: -days })
                              : t("dueIn", { days })}
                          </StatusBadge>
                        </span>
                      </Row>
                    );
                  })}
                </RowList>
                {more(deadlines.length)}
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardLinkTitle title={t("finishedTitle")} href="/models?phase=finished&scope=all&sort=newest" />
          <Stat value={stats.finishedCount} label={t("finishedHint")} />
        </Card>

        <Card>
          <CardLinkTitle title={t("pendingTitle")} href="/models?phase=finished&payment=pending&scope=all" />
          <Stat
            value={formatEuros(stats.pendingCents, locale)}
            label={t("pendingCount", { count: stats.pendingCount })}
          />
        </Card>

        <Card>
          <CardLinkTitle title={t("quotesTitle")} href="/quotes?status=open" />
          <Stat value={openQuotes.length} label={t("quotesHint")} />
          {openQuotes.length > 0 && (
            <div>
              <RowList>
                {openQuotes.slice(0, MAX_ROWS).map((q) => (
                  <Row key={q.id}>
                    <Link href={`/quotes/${q.id}`} className={rowLinkClass}>
                      {q.title}
                    </Link>
                    <span className="shrink-0 text-[13px] text-muted">
                      {t("quoteAge", { days: daysSince(q.createdAt) })}
                    </span>
                  </Row>
                ))}
              </RowList>
              {more(openQuotes.length)}
            </div>
          )}
        </Card>

        <Card>
          <CardLinkTitle title={t("staleTitle")} href="/models?phase=stalled&sort=oldest" />
          <Stat value={stalled.length} label={t("staleHint")} />
          {stalled.length > 0 && (
            <div>
              <RowList>
                {stalled.slice(0, MAX_ROWS).map((m) => (
                  <Row key={m.id}>
                    <Link href={`/models/${m.id}`} className={rowLinkClass}>
                      {modelTitle(m.brand, m.name)}
                    </Link>
                    <span className="shrink-0 text-[13px] text-muted">
                      {t("staleAge", { months: Math.floor(daysSince(m.createdAt) / 30) })}
                    </span>
                  </Row>
                ))}
              </RowList>
              {more(stalled.length)}
            </div>
          )}
        </Card>

        {profit.avgProfitCents !== null && (
          <Card className="md:col-span-2">
            <CardTitle>{t("profitabilityTitle")}</CardTitle>
            <div className="flex flex-wrap gap-x-10 gap-y-3">
              <Stat
                value={formatEuros(profit.avgProfitCents, locale)}
                valueClass={profit.avgProfitCents < 0 ? "text-bad" : "text-ok"}
                label={t("profitabilityProfit", { count: profit.count })}
              />
              <Stat
                value={
                  profit.centsPerHour !== null
                    ? `${formatEuros(profit.centsPerHour, locale)}/h`
                    : "—"
                }
                valueClass={
                  profit.centsPerHour === null ? "" : profit.centsPerHour < 0 ? "text-bad" : "text-ok"
                }
                label={
                  profit.centsPerHour !== null
                    ? t("profitabilityPerHour")
                    : t("profitabilityNoTime")
                }
              />
            </div>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardTitle>{t("financesTitle")}</CardTitle>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat value={formatEuros(stats.incomeCents, locale)} label={t("incomeLabel")} />
            <Stat value={formatEuros(expensesCents, locale)} label={t("expensesLabel")} />
            <Stat
              value={formatEuros(balanceCents, locale)}
              label={t("balanceLabel")}
              valueClass={balanceCents < 0 ? "text-bad" : "text-ok"}
            />
            <Stat
              value={formatEuros(unpaidExpenses.cents, locale)}
              valueClass={unpaidExpenses.count > 0 ? "text-warn" : ""}
              label={
                <Link href="/expenses" className="font-semibold text-brand hover:underline">
                  {t("unpaidExpensesLabel", { count: unpaidExpenses.count })}
                </Link>
              }
            />
          </div>
        </Card>
      </div>
    </>
  );
}
