import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, quotes } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { primaryButtonClass } from "@/components/ui/styles";
import { updateQuote } from "../../actions";
import { QuoteFields } from "../../quote-fields";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [[quote], clientRows] = await Promise.all([
    db
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.userId, user.id))),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
  ]);
  if (!quote) notFound();

  return (
    <>
      <BackLink href="/quotes">← Quotes</BackLink>
      <PageHeader title="Edit quote" />
      <Card>
        <form action={updateQuote.bind(null, id)} className="flex flex-col gap-3">
          <QuoteFields clients={clientRows} defaults={quote} />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Save
          </button>
        </form>
      </Card>
    </>
  );
}
