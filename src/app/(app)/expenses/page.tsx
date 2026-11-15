import Link from "next/link";
import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { models, parts } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import { containsPattern, descNullsLast, enumParam, textParam, type SearchParams } from "@/lib/list-filters";
import { pageWindow, parsePage } from "@/lib/pagination";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { CreateModal } from "@/components/ui/create-modal";
import { EditModal } from "@/components/ui/edit-modal";
import { PaidCheckButton } from "@/components/ui/icon-actions";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import { listItemClass } from "@/components/ui/styles";
import { createLoosePart, deleteLoosePart, setPartPaid, updateLoosePart } from "./actions";
import { ExpenseFields } from "./expense-fields";

// What can be owed: parts of models and loose purchases (no model, no quote) that
// have been bought (ordered or in hand). A part still "to order" is a plan, and
// quote parts are estimates. Parts taken from stock are not purchases (the stock
// was already bought and paid for), so they never appear here.
const bought = and(
  isNull(parts.quoteId),
  isNull(parts.stockComponentId),
  ne(parts.status, "to_order"),
);

const sorts = {
  model: { order: [asc(sql`lower(concat_ws(' ', ${models.brand}, ${models.name}))`)] },
  price_desc: { order: [descNullsLast(parts.priceCents)] },
  description: { order: [asc(parts.description)] },
  store: { order: [asc(parts.store), asc(parts.description)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

// "pending" (the default) is what is still unpaid.
const statusFilters = ["pending", "paid", "all"] as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("expenses");
  const tc = await getTranslations("common");
  const ts = await getTranslations("supplyStatus");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const status = enumParam(sp, "status", statusFilters) ?? "pending";
  const sort = enumParam(sp, "sort", sortKeys) ?? "model";

  const conditions: Array<SQL | undefined> = [
    eq(parts.userId, user.id),
    bought,
    status === "all" ? undefined : eq(parts.paid, status === "paid"),
    q
      ? or(
          ilike(parts.description, containsPattern(q)),
          ilike(parts.brand, containsPattern(q)),
          ilike(parts.reference, containsPattern(q)),
          ilike(parts.store, containsPattern(q)),
          ilike(sql`concat_ws(' ', ${models.brand}, ${models.name})`, containsPattern(q)),
        )
      : undefined,
  ];
  const activeCount = [q, status !== "pending"].filter(Boolean).length;

  // Total matches, so the requested page can be clamped to the last one.
  const [{ total }] = await db
    .select({ total: count() })
    .from(parts)
    .leftJoin(models, eq(models.id, parts.modelId))
    .where(and(...conditions));
  const win = pageWindow(parsePage(sp), total);

  const [rows, [owed]] = await Promise.all([
    db
      .select({ part: parts, modelId: models.id, modelBrand: models.brand, modelName: models.name })
      .from(parts)
      .leftJoin(models, eq(models.id, parts.modelId))
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, desc(parts.priceCents), asc(parts.id))
      .limit(win.limit)
      .offset(win.offset),
    // What is still owed across every unpaid bought part, whatever the list is filtered by.
    db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${parts.priceCents}), 0)::int`,
      })
      .from(parts)
      .where(and(eq(parts.userId, user.id), bought, eq(parts.paid, false))),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { amount: formatEuros(owed.cents, locale), count: owed.count })}
      />

      <CreateModal label={t("add")} title={t("add")} action={createLoosePart}>
        <ExpenseFields />
      </CreateModal>

      <ListFilters action="/expenses" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="status"
          label={t("paymentFilter")}
          defaultValue={status}
          options={statusFilters.map((k) => ({ value: k, label: t(`filter.${k}`) }))}
          allLabel={null}
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
            <li className="text-muted">{activeCount > 0 ? t("emptyFiltered") : t("empty")}</li>
          )}
          {rows.map(({ part: p, modelId, modelBrand, modelName }) => (
            <li key={p.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
              <div className="min-w-0">
                <p className={p.paid ? "font-bold text-muted" : "font-bold"}>{p.description}</p>
                <p className="text-[13px] text-muted">
                  {[p.brand, p.reference, p.store, formatEuros(p.priceCents, locale)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-[13px]">
                  {modelId && modelName ? (
                    <Link href={`/models/${modelId}`} className="font-semibold text-brand hover:underline">
                      {modelTitle(modelBrand, modelName)}
                    </Link>
                  ) : (
                    <span className="text-muted">{t("noModel")}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <StatusBadge variant={supplyStatusVariant(p.status)}>{ts(p.status)}</StatusBadge>
                <StatusBadge variant={p.paid ? "ok" : "warn"}>{p.paid ? t("paid") : t("unpaid")}</StatusBadge>
                <form action={setPartPaid.bind(null, p.id, !p.paid)}>
                  <PaidCheckButton paid={p.paid} label={p.paid ? t("markUnpaid") : t("markPaid")} />
                </form>
                {/* Parts of a model are edited on the model; loose ones only here. */}
                {!modelId && (
                  <>
                    <EditModal
                      label={tc("edit")}
                      title={t("editTitle")}
                      submitLabel={tc("save")}
                      action={updateLoosePart.bind(null, p.id)}
                    >
                      <ExpenseFields defaults={p} />
                    </EditModal>
                    <ConfirmDelete
                      label={tc("delete")}
                      title={t("deleteTitle")}
                      message={t("deleteMessage", { name: p.description })}
                      action={deleteLoosePart.bind(null, p.id)}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Pagination pathname="/expenses" searchParams={sp} pageInfo={win} total={total} />
    </>
  );
}
