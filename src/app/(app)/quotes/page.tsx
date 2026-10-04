import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, quotes } from "@/db/schema";
import { formatEuros, quoteStatusLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, quoteStatusVariant } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  linkActionClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { createQuote, deleteQuote } from "./actions";
import { QuoteFields } from "./quote-fields";

export default async function QuotesPage() {
  const user = await requireUser();
  const [rows, clientRows] = await Promise.all([
    db
      .select({ quote: quotes, clientName: clients.name })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.userId, user.id))
      .orderBy(desc(quotes.createdAt)),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
  ]);

  return (
    <>
      <PageHeader title="Quotes" subtitle="Proposals for upcoming work." />

      <Card>
        <CardTitle>Add quote</CardTitle>
        <form action={createQuote} className="flex flex-col gap-3">
          <QuoteFields clients={clientRows} />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Add quote
          </button>
        </form>
      </Card>

      <Card>
        <ul className="flex flex-col">
          {rows.length === 0 && <li className="text-muted">No quotes yet.</li>}
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
