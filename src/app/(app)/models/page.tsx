import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, models } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PhaseProgress } from "@/components/ui/phase-progress";
import { PhaseBadge } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  linkActionClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { createModel, deleteModel } from "./actions";
import { ModelFields } from "./model-fields";

export default async function ModelsPage() {
  const user = await requireUser();
  const [rows, clientRows] = await Promise.all([
    db
      .select({ model: models, clientName: clients.name })
      .from(models)
      .leftJoin(clients, eq(models.clientId, clients.id))
      .where(eq(models.userId, user.id))
      .orderBy(desc(models.createdAt)),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
  ]);

  return (
    <>
      <PageHeader title="Models" subtitle="Everything you are building or have built." />

      <Card>
        <CardTitle>Add model</CardTitle>
        <form action={createModel} className="flex flex-col gap-3">
          <ModelFields clients={clientRows} />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Add model
          </button>
        </form>
      </Card>

      <Card>
        <ul className="flex flex-col">
          {rows.length === 0 && <li className="text-muted">No models yet.</li>}
          {rows.map(({ model: m, clientName }) => (
            <li key={m.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-4`}>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[13px] font-semibold text-brand">{clientName ?? "Own project"}</p>
                <Link href={`/models/${m.id}`} className="font-bold hover:underline">
                  {m.name}
                </Link>
                <p className="text-[13px] text-muted">
                  {m.company ? `${m.company} · ` : ""}
                  {formatEuros(m.priceCents)}
                </p>
                <p className="text-[13px] text-muted">
                  Requested: {m.requestedDate ?? "—"} · Estimated: {m.estimatedDate ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col items-start gap-2">
                  <PhaseBadge phase={m.phase} />
                  <PhaseProgress phase={m.phase} />
                </div>
                <Link href={`/models/${m.id}/edit`} className={linkActionClass}>Edit</Link>
                <form action={deleteModel.bind(null, m.id)}>
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
