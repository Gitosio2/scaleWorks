import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PartsSection } from "@/app/(app)/parts-section";
import { db } from "@/db";
import { clients, parts, quotes } from "@/db/schema";
import { formatEuros, quoteStatusLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { StatusBadge, quoteStatusVariant } from "@/components/ui/status-badge";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";
import Link from "next/link";
import { convertQuoteToModel } from "./convert-action";
import {
  addQuotePart,
  deleteQuotePart,
  updateQuotePartStatus,
} from "./part-actions";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [row] = await db
    .select({ quote: quotes, clientName: clients.name })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(and(eq(quotes.id, id), eq(quotes.userId, user.id)));
  if (!row) notFound();
  const { quote: q, clientName } = row;

  const partRows = await db
    .select()
    .from(parts)
    .where(and(eq(parts.quoteId, id), eq(parts.userId, user.id)))
    .orderBy(parts.description);

  return (
    <>
      <BackLink href="/quotes">← Quotes</BackLink>
      <PageHeader
        title={q.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {clientName ?? "No client"} · {formatEuros(q.priceCents)}
            <StatusBadge variant={quoteStatusVariant(q.status)}>
              {quoteStatusLabels[q.status]}
            </StatusBadge>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-3">
            <Link href={`/quotes/${id}/edit`} className={secondaryButtonClass}>
              Edit quote
            </Link>
            <form action={convertQuoteToModel.bind(null, id)}>
              <button type="submit" className={primaryButtonClass}>
                Accept and convert to model
              </button>
            </form>
          </div>
        }
      />

      <PartsSection
        parts={partRows}
        add={addQuotePart.bind(null, id)}
        updateStatus={updateQuotePartStatus.bind(null, id)}
        remove={deleteQuotePart.bind(null, id)}
      />
    </>
  );
}
