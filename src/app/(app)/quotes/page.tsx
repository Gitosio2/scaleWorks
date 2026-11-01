import Link from "next/link";
import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { clients, quoteStatus, quotes } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import {
  ascNullsLast,
  containsPattern,
  descNullsLast,
  enumParam,
  textParam,
  uuidParam,
  type SearchParams,
} from "@/lib/list-filters";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateModal } from "@/components/ui/create-modal";
import { FilterSelect, FilterText, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, quoteStatusVariant } from "@/components/ui/status-badge";
import { DeleteIconButton, EditIconLink } from "@/components/ui/icon-actions";
import {
  listItemClass,
} from "@/components/ui/styles";
import { createQuote, deleteQuote } from "./actions";
import { QuoteFields } from "./quote-fields";

const sorts = {
  newest: { order: [desc(quotes.createdAt)] },
  oldest: { order: [asc(quotes.createdAt)] },
  title: { order: [asc(quotes.title)] },
  price_desc: { order: [descNullsLast(quotes.priceCents)] },
  price_asc: { order: [ascNullsLast(quotes.priceCents)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("quotes");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const tq = await getTranslations("quoteStatus");
  const locale = await getLocale();

  const q = textParam(sp, "q");
  const client =
    uuidParam(sp, "client") ?? (textParam(sp, "client") === "none" ? "none" : null);
  const status = enumParam(sp, "status", quoteStatus.enumValues);
  const sort = enumParam(sp, "sort", sortKeys) ?? "newest";

  const conditions: Array<SQL | undefined> = [
    eq(quotes.userId, user.id),
    q
      ? or(
          ilike(quotes.title, containsPattern(q)),
          ilike(clients.name, containsPattern(q)),
        )
      : undefined,
    client === "none"
      ? isNull(quotes.clientId)
      : client
        ? eq(quotes.clientId, client)
        : undefined,
    status ? eq(quotes.status, status) : undefined,
  ];
  const activeCount = [q, client, status].filter(Boolean).length;

  const [rows, clientRows] = await Promise.all([
    db
      .select({ quote: quotes, clientName: clients.name })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(quotes.id)),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
  ]);

  return (
    <>
      <PageHeader title={tn("quotes")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createQuote}>
        <QuoteFields clients={clientRows} />
      </CreateModal>

      <ListFilters action="/quotes" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="client"
          label={tc("client")}
          defaultValue={client ?? ""}
          options={[
            { value: "none", label: t("noClient") },
            ...clientRows.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          name="status"
          label={tc("status")}
          defaultValue={status ?? ""}
          options={quoteStatus.enumValues.map((s) => ({ value: s, label: tq(s) }))}
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
          {rows.map(({ quote: q, clientName }) => (
            <li key={q.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-4`}>
              <div className="min-w-0">
                <Link href={`/quotes/${q.id}`} className="font-bold hover:underline">
                  {q.title}
                </Link>
                <p className="text-[13px] text-muted">{clientName ?? t("noClient")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">{formatEuros(q.priceCents, locale)}</span>
                <StatusBadge variant={quoteStatusVariant(q.status)}>
                  {tq(q.status)}
                </StatusBadge>
                <div className="flex items-center">
                  <EditIconLink href={`/quotes/${q.id}/edit`} label={tc("edit")} />
                  <form action={deleteQuote.bind(null, q.id)}>
                    <DeleteIconButton label={tc("delete")} />
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
