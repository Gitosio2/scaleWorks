import { and, asc, count, eq, gt, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { stockComponents } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import {
  ascNullsLast,
  containsPattern,
  descNullsLast,
  enumParam,
  textParam,
  type SearchParams,
} from "@/lib/list-filters";
import { pageWindow, parsePage } from "@/lib/pagination";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { CreateModal } from "@/components/ui/create-modal";
import { EditModal } from "@/components/ui/edit-modal";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import { listItemClass } from "@/components/ui/styles";
import {
  adjustComponentQuantity,
  createComponent,
  deleteComponent,
  updateComponent,
} from "./actions";
import { ComponentFields } from "./component-fields";
import { QuantityStepper } from "./quantity-stepper";

const c = stockComponents;
const sorts = {
  description: { order: [asc(c.description)] },
  brand: { order: [ascNullsLast(c.brand), asc(c.description)] },
  store: { order: [ascNullsLast(c.store), asc(c.description)] },
  price_desc: { order: [descNullsLast(c.priceCents)] },
  price_asc: { order: [ascNullsLast(c.priceCents)] },
  quantity_asc: { order: [asc(c.quantity), asc(c.description)] },
  quantity_desc: { order: [descNullsLast(c.quantity), asc(c.description)] },
};
const stockKeys = ["available", "empty"] as const;
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("components");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const ts = await getTranslations("supplyStatus");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const store = textParam(sp, "store");
  const brand = textParam(sp, "brand");
  const stock = enumParam(sp, "stock", stockKeys);
  const sort = enumParam(sp, "sort", sortKeys) ?? "description";

  const conditions: Array<SQL | undefined> = [
    eq(c.userId, user.id),
    q
      ? or(
          ilike(c.description, containsPattern(q)),
          ilike(c.brand, containsPattern(q)),
          ilike(c.reference, containsPattern(q)),
          ilike(c.store, containsPattern(q)),
        )
      : undefined,
    store ? eq(c.store, store) : undefined,
    brand ? eq(c.brand, brand) : undefined,
    stock === "available" ? gt(c.quantity, 0) : undefined,
    stock === "empty" ? eq(c.quantity, 0) : undefined,
  ];
  const activeCount = [q, store, brand, stock].filter(Boolean).length;

  // Total matches, so the requested page can be clamped to the last one.
  const [{ total }] = await db.select({ total: count() }).from(c).where(and(...conditions));
  const win = pageWindow(parsePage(sp), total);

  const [rows, storeRows, brandRows] = await Promise.all([
    db
      .select()
      .from(c)
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(c.id))
      .limit(win.limit)
      .offset(win.offset),
    db
      .selectDistinct({ store: c.store })
      .from(c)
      .where(and(eq(c.userId, user.id), isNotNull(c.store)))
      .orderBy(c.store),
    db
      .selectDistinct({ brand: c.brand })
      .from(c)
      .where(and(eq(c.userId, user.id), isNotNull(c.brand)))
      .orderBy(c.brand),
  ]);

  return (
    <>
      <PageHeader title={tn("components")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createComponent}>
        <ComponentFields />
      </CreateModal>

      <ListFilters action="/components" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="brand"
          label={tc("brand")}
          defaultValue={brand}
          options={brandRows.map((r) => ({ value: r.brand!, label: r.brand! }))}
        />
        <FilterSelect
          name="store"
          label={tc("store")}
          defaultValue={store}
          options={storeRows.map((r) => ({ value: r.store!, label: r.store! }))}
        />
        <FilterSelect
          name="stock"
          label={t("stock.label")}
          defaultValue={stock ?? ""}
          options={stockKeys.map((k) => ({ value: k, label: t(`stock.${k}`) }))}
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
          {rows.map((row) => (
            <li key={row.id} className={`${listItemClass} flex flex-wrap items-start justify-between gap-4`}>
              <div className="min-w-0">
                <p className="font-bold">{row.description}</p>
                <p className="text-[13px] text-muted">
                  {[row.brand, row.reference, row.store].filter(Boolean).join(" · ") || tc("noValue")}
                  {row.priceCents !== null &&
                    ` · ${t("unitPriceValue", { amount: formatEuros(row.priceCents, locale) })}`}
                </p>
                {row.url && (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-semibold text-brand hover:text-brand-hover"
                  >
                    {t("openLink")}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {row.status !== "in_hand" && (
                  <StatusBadge variant={supplyStatusVariant(row.status)}>{ts(row.status)}</StatusBadge>
                )}
                {row.status === "in_hand" && row.quantity === 0 && (
                  <StatusBadge variant="mute">{t("outOfStock")}</StatusBadge>
                )}
                <QuantityStepper
                  quantity={row.quantity}
                  action={adjustComponentQuantity.bind(null, row.id)}
                />
                <div className="flex items-center">
                  <EditModal
                    label={tc("edit")}
                    title={t("editTitle")}
                    submitLabel={tc("save")}
                    action={updateComponent.bind(null, row.id)}
                  >
                    <ComponentFields defaults={row} />
                  </EditModal>
                  <ConfirmDelete
                    label={tc("delete")}
                    title={t("deleteTitle")}
                    message={t("deleteMessage", { name: row.description })}
                    action={deleteComponent.bind(null, row.id)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Pagination pathname="/components" searchParams={sp} pageInfo={win} total={total} />
    </>
  );
}
