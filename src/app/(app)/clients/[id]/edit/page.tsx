import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { primaryButtonClass } from "@/components/ui/styles";
import { updateClient } from "../../actions";
import { ClientFields } from "../../client-fields";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
  if (!client) notFound();

  return (
    <>
      <BackLink href="/clients">← Clients</BackLink>
      <PageHeader title="Edit client" />
      <Card>
        <form action={updateClient.bind(null, id)} className="flex flex-col gap-3">
          <ClientFields defaults={client} />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Save
          </button>
        </form>
      </Card>
    </>
  );
}
