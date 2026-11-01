import Link from "next/link";
import { and, asc, desc, eq, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
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
import {
  dangerActionClass,
  linkActionClass,
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
      .select()
      .from(clients)
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(clients.id)),
    db
      .selectDistinct({ company: clients.company })
      .from(clients)
      .where(and(eq(clients.userId, user.id), isNotNull(clients.company)))
      .orderBy(clients.company),
  ]);

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

      <Card>
        <ul className="flex flex-col">
          {rows.length === 0 && (
            <li className="text-muted">
              {activeCount > 0 ? t("emptyFiltered") : t("empty")}
            </li>
          )}
          {rows.map((c) => (
            <li key={c.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-4`}>
              <div className="min-w-0">
                <p className="font-bold">{c.name}</p>
                <p className="text-[13px] text-muted">
                  {c.contact}
                  {c.company ? ` · ${c.company}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/clients/${c.id}/edit`} className={linkActionClass}>{tc("edit")}</Link>
                <form action={deleteClient.bind(null, c.id)}>
                  <button type="submit" className={dangerActionClass}>{tc("delete")}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
