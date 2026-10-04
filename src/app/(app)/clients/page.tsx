import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  dangerActionClass,
  linkActionClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { createClient, deleteClient } from "./actions";
import { ClientFields } from "./client-fields";

export default async function ClientsPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, user.id))
    .orderBy(desc(clients.createdAt));

  return (
    <>
      <PageHeader title="Clients" subtitle="People and companies you work for." />

      <Card>
        <CardTitle>Add client</CardTitle>
        <form action={createClient} className="flex flex-col gap-3">
          <ClientFields />
          <button type="submit" className={`${primaryButtonClass} self-start`}>
            Add client
          </button>
        </form>
      </Card>

      <Card>
        <ul className="flex flex-col">
          {rows.length === 0 && <li className="text-muted">No clients yet.</li>}
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
                <Link href={`/clients/${c.id}/edit`} className={linkActionClass}>Edit</Link>
                <form action={deleteClient.bind(null, c.id)}>
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
