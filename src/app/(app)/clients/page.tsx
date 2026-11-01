import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { clients, models, quotes } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import {
  containsPattern,
  enumParam,
  textParam,
  type SearchParams,
} from "@/lib/list-filters";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateModal } from "@/components/ui/create-modal";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EditIconLink } from "@/components/ui/icon-actions";
import { PhaseBadge, StatusBadge } from "@/components/ui/status-badge";
import {
  listItemClass,
} from "@/components/ui/styles";
import { createClient, deleteClient } from "./actions";
import { ClientFields } from "./client-fields";

const sorts = {
  newest: { order: [desc(clients.createdAt)] },
  oldest: { order: [asc(clients.createdAt)] },
  name: { order: [asc(clients.name)] },
  company: { order: [asc(clients.company), asc(clients.name)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("clients");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const company = textParam(sp, "company");
  const sort = enumParam(sp, "sort", sortKeys) ?? "newest";

  const conditions: Array<SQL | undefined> = [
    eq(clients.userId, user.id),
    q
      ? or(
          ilike(clients.name, containsPattern(q)),
          ilike(clients.contact, containsPattern(q)),
          ilike(clients.company, containsPattern(q)),
        )
      : undefined,
    company ? eq(clients.company, company) : undefined,
  ];
  const activeCount = [q, company].filter(Boolean).length;

  const [rows, companyRows] = await Promise.all([
    db
      .select({
        ...getTableColumns(clients),
        // Models and quotes pointing at this client; any of them blocks deletion.
        // Drizzle drops table qualifiers inside sql``, so the outer id is written
        // out: a bare "id" would resolve to the inner table's own id.
        modelCount: sql<number>`(
          select count(*) from ${models} where ${models.clientId} = ${sql.raw('"clients"."id"')}
        )::int`,
        quoteCount: sql<number>`(
          select count(*) from ${quotes} where ${quotes.clientId} = ${sql.raw('"clients"."id"')}
        )::int`,
        // Still owed on this client's models: price minus any deposit, for unpaid
        // models with a price. A model without a price yet owes nothing to show.
        pendingCents: sql<number>`(
          select coalesce(sum(${models.priceCents} - coalesce(${models.depositCents}, 0)), 0)
          from ${models}
          where ${models.clientId} = ${sql.raw('"clients"."id"')}
            and ${models.paymentStatus} <> 'paid'
            and ${models.priceCents} is not null
        )::int`,
      })
      .from(clients)
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(clients.id)),
    db
      .selectDistinct({ company: clients.company })
      .from(clients)
      .where(and(eq(clients.userId, user.id), isNotNull(clients.company)))
      .orderBy(clients.company),
  ]);

  // Models of the listed clients, grouped for the expandable list on each card.
  const modelRows = rows.length
    ? await db
        .select({ id: models.id, name: models.name, phase: models.phase, clientId: models.clientId })
        .from(models)
        .where(inArray(models.clientId, rows.map((c) => c.id)))
        .orderBy(asc(models.name), asc(models.id))
    : [];
  const modelsByClient = Map.groupBy(modelRows, (m) => m.clientId);

  return (
    <>
      <PageHeader title={tn("clients")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createClient}>
        <ClientFields />
      </CreateModal>

      <ListFilters action="/clients" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="company"
          label={tc("company")}
          defaultValue={company}
          options={companyRows.map((r) => ({ value: r.company!, label: r.company! }))}
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
              {activeCount > 0 ? t("emptyFiltered") : t("empty")}
            </li>
          )}
          {rows.map((c) => (
            <li key={c.id} className={`${listItemClass} group flex flex-wrap items-center gap-x-4 gap-y-2`}>
              <div className="min-w-48 flex-1">
                <p className="font-bold">{c.name}</p>
                <p className="text-[13px] text-muted">
                  {[c.contact, c.company].filter(Boolean).join(" · ") || tc("noValue")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.modelCount > 0 ? (
                  // Checkbox-in-label toggle: the list below opens with CSS only.
                  <label className="cursor-pointer rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand">
                    <input type="checkbox" className="sr-only" />
                    <StatusBadge variant="mute">
                      {t("modelCount", { count: c.modelCount })}
                      <span aria-hidden className="text-[10px] transition-transform group-has-[input:checked]:rotate-180">▼</span>
                    </StatusBadge>
                  </label>
                ) : (
                  <StatusBadge variant="mute">{t("modelCount", { count: c.modelCount })}</StatusBadge>
                )}
                {c.quoteCount > 0 && (
                  <StatusBadge variant="warn">{t("quoteCount", { count: c.quoteCount })}</StatusBadge>
                )}
                {c.pendingCents > 0 && (
                  <StatusBadge variant="warn">
                    {t("pendingPayment", { amount: formatEuros(c.pendingCents, locale) })}
                  </StatusBadge>
                )}
              </div>
              <div className="ml-auto flex items-center">
                <EditIconLink href={`/clients/${c.id}/edit`} label={tc("edit")} />
                <ConfirmDelete
                  label={tc("delete")}
                  title={t("deleteTitle")}
                  message={t("deleteMessage", { name: c.name })}
                  action={deleteClient.bind(null, c.id)}
                  blockedReason={c.modelCount + c.quoteCount > 0 ? t("deleteBlocked") : undefined}
                />
              </div>
              {c.modelCount > 0 && (
                <ul className="hidden w-full basis-full flex-col border-t border-line-soft pt-2 group-has-[input:checked]:flex">
                  {(modelsByClient.get(c.id) ?? []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                      <Link href={`/models/${m.id}`} className="min-w-0 font-semibold text-brand hover:underline">
                        {m.name}
                      </Link>
                      <PhaseBadge phase={m.phase} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
