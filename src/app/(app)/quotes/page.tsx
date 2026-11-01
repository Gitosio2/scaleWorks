import Link from "next/link";
import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clients, quoteStatus, quotes } from "@/db/schema";
import { formatEuros, quoteStatusLabels } from "@/lib/labels";
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
import {
  dangerActionClass,
  linkActionClass,
  listItemClass,
} from "@/components/ui/styles";
import { createQuote, deleteQuote } from "./actions";
import { QuoteFields } from "./quote-fields";

const sorts = {
  newest: { label: "Newest first", order: [desc(quotes.createdAt)] },
  oldest: { label: "Oldest first", order: [asc(quotes.createdAt)] },
  title: { label: "Title (A–Z)", order: [asc(quotes.title)] },
  price_desc: { label: "Price (high to low)", order: [descNullsLast(quotes.priceCents)] },
  price_asc: { label: "Price (low to high)", order: [ascNullsLast(quotes.priceCents)] },
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
      <PageHeader title="Quotes" subtitle="Proposals for upcoming work." />

      <CreateModal label="Add quote" title="Add quote" action={createQuote}>
        <QuoteFields clients={clientRows} />
      </CreateModal>

      <ListFilters action="/quotes" activeCount={activeCount}>
        <FilterText name="q" label="Search" defaultValue={q} placeholder="Title or client" />
        <FilterSelect
          name="client"
          label="Client"
          defaultValue={client ?? ""}
          options={[
            { value: "none", label: "No client" },
            ...clientRows.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={status ?? ""}
          options={quoteStatus.enumValues.map((s) => ({ value: s, label: quoteStatusLabels[s] }))}
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
              {activeCount > 0 ? "No quotes match these filters." : "No quotes yet."}
            </li>
          )}
          {rows.map(({ quote: q, clientName }) => (
            <li key={q.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-4`}>
              <div className="min-w-0">
                <Link href={`/quotes/${q.id}`} className="font-bold hover:underline">
                  {q.title}
                </Link>
                <p className="text-[13px] text-muted">{clientName ?? "No client"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">{formatEuros(q.priceCents)}</span>
                <StatusBadge variant={quoteStatusVariant(q.status)}>
                  {quoteStatusLabels[q.status]}
                </StatusBadge>
                <Link href={`/quotes/${q.id}/edit`} className={linkActionClass}>Edit</Link>
                <form action={deleteQuote.bind(null, q.id)}>
                  <button type="submit" className={dangerActionClass}>Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
