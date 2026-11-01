import Link from "next/link";
import { and, asc, eq, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { consumables, supplyStatus } from "@/db/schema";
import { formatEuros, supplyStatusLabels } from "@/lib/labels";
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
import {
  dangerActionClass,
  inputClass,
  linkActionClass,
  listItemClass,
} from "@/components/ui/styles";
import {
  createConsumable,
  deleteConsumable,
  updateConsumableStatus,
} from "./actions";
import { ConsumableFields } from "./consumable-fields";

const sorts = {
  description: { label: "Description (A–Z)", order: [asc(consumables.description)] },
  store: {
    label: "Store (A–Z)",
    order: [ascNullsLast(consumables.store), asc(consumables.description)],
  },
  price_desc: { label: "Price (high to low)", order: [descNullsLast(consumables.priceCents)] },
  price_asc: { label: "Price (low to high)", order: [ascNullsLast(consumables.priceCents)] },
  status: { label: "Status", order: [asc(consumables.status), asc(consumables.description)] },
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

  const q = textParam(sp, "q");
  const store = textParam(sp, "store");
  const status = enumParam(sp, "status", supplyStatus.enumValues);
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
  ];
  const activeCount = [q, store, status].filter(Boolean).length;

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
      <PageHeader title="Consumables" subtitle="Paints, glues and other supplies." />

      <CreateModal label="Add consumable" title="Add consumable" action={createConsumable}>
        <ConsumableFields />
      </CreateModal>

      <ListFilters action="/consumables" activeCount={activeCount}>
        <FilterText name="q" label="Search" defaultValue={q} placeholder="Description, reference or store" />
        <FilterSelect
          name="store"
          label="Store"
          defaultValue={store}
          options={storeRows.map((r) => ({ value: r.store!, label: r.store! }))}
        />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={status ?? ""}
          options={supplyStatus.enumValues.map((s) => ({ value: s, label: supplyStatusLabels[s] }))}
        />
        <FilterSelect
          name="sort"
          label="Sort by"
          defaultValue={sort}
          options={sortKeys.map((k) => ({ value: k, label: sorts[k].label }))}
          allLabel={null}
        />
      </ListFilters>

      <Card>
        <ul className="flex flex-col">
          {rows.length === 0 && (
            <li className="text-muted">
              {activeCount > 0 ? "No consumables match these filters." : "No consumables yet."}
            </li>
          )}
          {rows.map((c) => (
            <li key={c.id} className={`${listItemClass} flex flex-col gap-2`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold">{c.description}</p>
                  <p className="text-[13px] text-muted">
                    {[c.store, c.reference].filter(Boolean).join(" · ") || "—"}
                    {" · "}
                    {formatEuros(c.priceCents)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={supplyStatusVariant(c.status)}>
                    {supplyStatusLabels[c.status]}
                  </StatusBadge>
                  <Link href={`/consumables/${c.id}/edit`} className={linkActionClass}>Edit</Link>
                  <form action={deleteConsumable.bind(null, c.id)}>
                    <button type="submit" className={dangerActionClass}>Delete</button>
                  </form>
                </div>
              </div>
              <form action={updateConsumableStatus.bind(null, c.id)} className="flex flex-wrap items-center gap-2">
                <select name="status" defaultValue={c.status} aria-label="Status" className={`${inputClass} text-sm`}>
                  {supplyStatus.enumValues.map((s) => (
                    <option key={s} value={s}>{supplyStatusLabels[s]}</option>
                  ))}
                </select>
                <button type="submit" className={linkActionClass}>Update status</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
