import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { expenses, expenseStatus } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import {
  containsPattern,
  descNullsLast,
  enumParam,
  textParam,
  type SearchParams,
} from "@/lib/list-filters";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { CreateModal } from "@/components/ui/create-modal";
import { EditModal } from "@/components/ui/edit-modal";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { expenseStatusVariant, StatusBadge } from "@/components/ui/status-badge";
import { listItemClass } from "@/components/ui/styles";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  updateExpenseStatus,
} from "./actions";
import { ExpenseFields } from "./expense-fields";

const sorts = {
  newest: { order: [desc(expenses.createdAt)] },
  oldest: { order: [asc(expenses.createdAt)] },
  price_desc: { order: [descNullsLast(expenses.priceCents)] },
  description: { order: [asc(expenses.description)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

// "pending" (the default) is everything not paid yet: ordered or received.
const statusFilters = ["pending", ...expenseStatus.enumValues, "all"] as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("expenses");
  const tc = await getTranslations("common");
  const ts = await getTranslations("expenseStatus");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const status = enumParam(sp, "status", statusFilters) ?? "pending";
  const sort = enumParam(sp, "sort", sortKeys) ?? "newest";

  const conditions: Array<SQL | undefined> = [
    eq(expenses.userId, user.id),
    q
      ? or(
          ilike(expenses.description, containsPattern(q)),
          ilike(expenses.store, containsPattern(q)),
        )
      : undefined,
    status === "pending"
      ? ne(expenses.status, "paid")
      : status === "all"
        ? undefined
        : eq(expenses.status, status),
  ];
  const activeCount = [q, status !== "pending"].filter(Boolean).length;

  const statusOptions = expenseStatus.enumValues.map((s) => ({
    value: s as string,
    label: ts(s),
    variant: expenseStatusVariant(s),
  }));

  const [rows, [owed]] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(expenses.id)),
    // What is still owed across all unpaid items, whatever the list is filtered by.
    db
      .select({
        count: sql<number>`count(*) filter (where ${expenses.status} <> 'paid')::int`,
        cents: sql<number>`coalesce(sum(${expenses.priceCents}) filter (where ${expenses.status} <> 'paid'), 0)::int`,
      })
      .from(expenses)
      .where(eq(expenses.userId, user.id)),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { amount: formatEuros(owed.cents, locale), count: owed.count })}
      />

      <CreateModal label={t("add")} title={t("add")} action={createExpense}>
        <ExpenseFields />
      </CreateModal>

      <ListFilters action="/expenses" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="status"
          label={tc("status")}
          defaultValue={status}
          options={statusFilters.map((k) => ({
            value: k,
            label: k === "pending" || k === "all" ? t(`filter.${k}`) : ts(k),
          }))}
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
          {rows.map((e) => (
            <li key={e.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
              <div className="min-w-0">
                <p className={e.status === "paid" ? "font-bold text-muted" : "font-bold"}>
                  {e.description}
                </p>
                <p className="text-[13px] text-muted">
                  {[e.store, formatEuros(e.priceCents, locale)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedToggle
                  value={e.status}
                  options={statusOptions}
                  action={updateExpenseStatus.bind(null, e.id)}
                  label={tc("status")}
                />
                <StatusBadge variant={expenseStatusVariant(e.status)}>{ts(e.status)}</StatusBadge>
                <div className="flex items-center">
                  <EditModal
                    label={tc("edit")}
                    title={t("editTitle")}
                    submitLabel={tc("save")}
                    action={updateExpense.bind(null, e.id)}
                  >
                    <ExpenseFields defaults={e} />
                  </EditModal>
                  <ConfirmDelete
                    label={tc("delete")}
                    title={t("deleteTitle")}
                    message={t("deleteMessage", { name: e.description })}
                    action={deleteExpense.bind(null, e.id)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
