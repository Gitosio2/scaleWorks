import { and, asc, eq, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumableCategory, consumables, supplyStatus } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import {
  ascNullsLast,
  containsPattern,
  descNullsLast,
  enumParam,
  textParam,
  type SearchParams,
} from "@/lib/list-filters";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateModal } from "@/components/ui/create-modal";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DeleteIconButton } from "@/components/ui/icon-actions";
import { EditModal } from "@/components/ui/edit-modal";
import {
  listItemClass,
} from "@/components/ui/styles";
import {
  createConsumable,
  deleteConsumable,
  updateConsumable,
  updateConsumableStatus,
} from "./actions";
import { ColorSwatch } from "./color-swatch";
import { ConsumableFields } from "./consumable-fields";

const sorts = {
  description: { order: [asc(consumables.description)] },
  store: { order: [ascNullsLast(consumables.store), asc(consumables.description)] },
  price_desc: { order: [descNullsLast(consumables.priceCents)] },
  price_asc: { order: [ascNullsLast(consumables.priceCents)] },
  status: { order: [asc(consumables.status), asc(consumables.description)] },
  category: { order: [asc(consumables.category), asc(consumables.description)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

export default async function ConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("consumables");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const ts = await getTranslations("supplyStatus");
  const tcat = await getTranslations("consumableCategory");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const store = textParam(sp, "store");
  const status = enumParam(sp, "status", supplyStatus.enumValues);
  const category = enumParam(sp, "category", consumableCategory.enumValues);
  const sort = enumParam(sp, "sort", sortKeys) ?? "description";

  const conditions: Array<SQL | undefined> = [
    eq(consumables.userId, user.id),
    q
      ? or(
          ilike(consumables.description, containsPattern(q)),
          ilike(consumables.reference, containsPattern(q)),
          ilike(consumables.store, containsPattern(q)),
        )
      : undefined,
    store ? eq(consumables.store, store) : undefined,
    status ? eq(consumables.status, status) : undefined,
    category ? eq(consumables.category, category) : undefined,
  ];
  const activeCount = [q, store, status, category].filter(Boolean).length;

  const [rows, storeRows] = await Promise.all([
    db
      .select()
      .from(consumables)
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(consumables.id)),
    db
      .selectDistinct({ store: consumables.store })
      .from(consumables)
      .where(and(eq(consumables.userId, user.id), isNotNull(consumables.store)))
      .orderBy(consumables.store),
  ]);

  return (
    <>
      <PageHeader title={tn("consumables")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createConsumable}>
        <ConsumableFields />
      </CreateModal>

      <ListFilters action="/consumables" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="store"
          label={tc("store")}
          defaultValue={store}
          options={storeRows.map((r) => ({ value: r.store!, label: r.store! }))}
        />
        <FilterSelect
          name="status"
          label={tc("status")}
          defaultValue={status ?? ""}
          options={supplyStatus.enumValues.map((s) => ({ value: s, label: ts(s) }))}
        />
        <FilterSelect
          name="category"
          label={tc("category")}
          defaultValue={category ?? ""}
          options={consumableCategory.enumValues.map((c) => ({ value: c, label: tcat(c) }))}
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
            <li key={c.id} className={`${listItemClass} flex flex-col gap-2`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-stretch gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{c.description}</p>
                    <p className="text-[13px] text-muted">
                      {tcat(c.category)}
                      {" · "}
                      {[c.store, c.reference].filter(Boolean).join(" · ") || tc("noValue")}
                      {" · "}
                      {formatEuros(c.priceCents, locale)}
                    </p>
                  </div>
                  <ColorSwatch colorHex={c.colorHex} reference={c.reference} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedToggle
                    value={c.status}
                    options={supplyStatus.enumValues.map((s) => ({
                      value: s,
                      label: ts(s),
                      variant: supplyStatusVariant(s),
                    }))}
                    action={updateConsumableStatus.bind(null, c.id)}
                    label={tc("status")}
                  />
                  <StatusBadge variant={supplyStatusVariant(c.status)}>
                    {ts(c.status)}
                  </StatusBadge>
                  <div className="flex items-center">
                    <EditModal
                      label={tc("edit")}
                      title={t("editTitle")}
                      submitLabel={tc("save")}
                      action={updateConsumable.bind(null, c.id)}
                    >
                      <ConsumableFields defaults={c} />
                    </EditModal>
                    <form action={deleteConsumable.bind(null, c.id)}>
                      <DeleteIconButton label={tc("delete")} />
                    </form>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
