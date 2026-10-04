import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PartsSection } from "@/app/parts-section";
import { db } from "@/db";
import { clients, parts, quotes } from "@/db/schema";
import { formatEuros, quoteStatusLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <Link href="/quotes" className="text-sm underline">
          ← Quotes
        </Link>
        <h1 className="text-2xl font-semibold">{q.title}</h1>
        <p className="text-sm text-zinc-500">
          {clientName ?? "No client"} · {quoteStatusLabels[q.status]} ·{" "}
          {formatEuros(q.priceCents)}
        </p>
        <Link href={`/quotes/${id}/edit`} className="text-sm underline">
          Edit quote
        </Link>
        <form action={convertQuoteToModel.bind(null, id)} className="pt-2">
          <button
            type="submit"
            className="rounded bg-foreground px-3 py-2 text-sm text-background"
          >
            Accept and convert to model
          </button>
        </form>
      </div>

      <PartsSection
        parts={partRows}
        add={addQuotePart.bind(null, id)}
        updateStatus={updateQuotePartStatus.bind(null, id)}
        remove={deleteQuotePart.bind(null, id)}
      />
    </main>
  );
}
