import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, models } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { primaryButtonClass } from "@/components/ui/styles";
import { updateModel } from "../../actions";
import { ModelFields } from "../../model-fields";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [[model], clientRows] = await Promise.all([
    db
      .select()
      .from(models)
      .where(and(eq(models.id, id), eq(models.userId, user.id))),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
  ]);
  if (!model) notFound();

  return (
    <>
      <BackLink href="/models">← Models</BackLink>
      <PageHeader title="Edit model" />
      <Card>
        <form action={updateModel.bind(null, id)} className="flex flex-col gap-3">
          <ModelFields clients={clientRows} defaults={model} />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Save
          </button>
        </form>
      </Card>
    </>
  );
}
