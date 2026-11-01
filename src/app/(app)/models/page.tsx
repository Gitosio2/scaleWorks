import Link from "next/link";
import { and, asc, desc, eq, ilike, isNotNull, isNull, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clients, modelPhase, models, paymentStatus } from "@/db/schema";
import { formatEuros, paymentStatusLabels, phaseLabels } from "@/lib/labels";
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
import { PhaseProgress } from "@/components/ui/phase-progress";
import { PaymentBadge, PhaseBadge } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  linkActionClass,
  listItemClass,
} from "@/components/ui/styles";
import { createModel, deleteModel } from "./actions";
import { ModelFields } from "./model-fields";

const sorts = {
  newest: { label: "Newest first", order: [desc(models.createdAt)] },
  oldest: { label: "Oldest first", order: [asc(models.createdAt)] },
  name: { label: "Name (A–Z)", order: [asc(models.name)] },
  price_desc: { label: "Price (high to low)", order: [descNullsLast(models.priceCents)] },
  price_asc: { label: "Price (low to high)", order: [ascNullsLast(models.priceCents)] },
  requested: { label: "Requested date", order: [ascNullsLast(models.requestedDate)] },
  estimated: { label: "Estimated date", order: [ascNullsLast(models.estimatedDate)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

// "open" (the default) hides models that are both finished and paid in full.
const scopes = [
  { value: "open", label: "Unfinished or not fully paid" },
  { value: "all", label: "Everything" },
];

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();

  const q = textParam(sp, "q");
  const client = uuidParam(sp, "client") ?? (textParam(sp, "client") === "none" ? "none" : null);
  const company = textParam(sp, "company");
  const phase = enumParam(sp, "phase", modelPhase.enumValues);
  const payment = enumParam(sp, "payment", paymentStatus.enumValues);
  const scope = textParam(sp, "scope") === "all" ? "all" : "open";
  const sort = enumParam(sp, "sort", sortKeys) ?? "newest";

  const conditions: Array<SQL | undefined> = [
    eq(models.userId, user.id),
    q
      ? or(
          ilike(models.name, containsPattern(q)),
          ilike(models.company, containsPattern(q)),
          ilike(clients.name, containsPattern(q)),
        )
      : undefined,
    client === "none" ? isNull(models.clientId) : client ? eq(models.clientId, client) : undefined,
    company ? eq(models.company, company) : undefined,
    phase ? eq(models.phase, phase) : undefined,
    payment ? eq(models.paymentStatus, payment) : undefined,
    scope === "open"
      ? or(ne(models.phase, "finished"), ne(models.paymentStatus, "paid"))
      : undefined,
  ];
  const activeCount = [q, client, company, phase, payment, scope === "open"].filter(Boolean).length;
  const hasUserFilters = [q, client, company, phase, payment].some(Boolean);

  const [rows, clientRows, companyRows] = await Promise.all([
    db
      .select({ model: models, clientName: clients.name })
      .from(models)
      .leftJoin(clients, eq(models.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(...sorts[sort].order, asc(models.id)),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.name),
    db
      .selectDistinct({ company: models.company })
      .from(models)
      .where(and(eq(models.userId, user.id), isNotNull(models.company)))
      .orderBy(models.company),
  ]);

  return (
    <>
      <PageHeader title="Models" subtitle="Everything you are building or have built." />

      <CreateModal label="Add model" title="Add model" action={createModel}>
        <ModelFields clients={clientRows} />
      </CreateModal>

      <ListFilters action="/models" activeCount={activeCount}>
        <FilterText name="q" label="Search" defaultValue={q} placeholder="Name, company or client" />
        <FilterSelect
          name="scope"
          label="Show"
          defaultValue={scope}
          options={scopes}
          allLabel={null}
        />
        <FilterSelect
          name="client"
          label="Client"
          defaultValue={client ?? ""}
          options={[
            { value: "none", label: "Own project" },
            ...clientRows.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          name="company"
          label="Company"
          defaultValue={company}
          options={companyRows.map((r) => ({ value: r.company!, label: r.company! }))}
        />
        <FilterSelect
          name="phase"
          label="Phase"
          defaultValue={phase ?? ""}
          options={modelPhase.enumValues.map((p) => ({ value: p, label: phaseLabels[p] }))}
        />
        <FilterSelect
          name="payment"
          label="Payment"
          defaultValue={payment ?? ""}
          options={paymentStatus.enumValues.map((p) => ({ value: p, label: paymentStatusLabels[p] }))}
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
              {hasUserFilters
                ? "No models match these filters."
                : scope === "open"
                  ? "No unfinished or unpaid models. Finished and fully paid ones are hidden."
                  : "No models yet."}
            </li>
          )}
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
                  <PaymentBadge status={m.paymentStatus} priceCents={m.priceCents} depositCents={m.depositCents} />
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
