import Link from "next/link";
import { and, asc, desc, eq, ilike, isNotNull, isNull, ne, or, type SQL } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { clients, modelPhase, models, paymentStatus } from "@/db/schema";
import { formatDate, formatEuros } from "@/lib/labels";
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
import { DeleteIconButton, EditIconLink } from "@/components/ui/icon-actions";
import {
  listItemClass,
} from "@/components/ui/styles";
import { createModel, deleteModel } from "./actions";
import { ModelFields } from "./model-fields";

const sorts = {
  newest: { order: [desc(models.createdAt)] },
  oldest: { order: [asc(models.createdAt)] },
  name: { order: [asc(models.name)] },
  price_desc: { order: [descNullsLast(models.priceCents)] },
  price_asc: { order: [ascNullsLast(models.priceCents)] },
  requested: { order: [ascNullsLast(models.requestedDate)] },
  estimated: { order: [ascNullsLast(models.estimatedDate)] },
};
type SortKey = keyof typeof sorts;
const sortKeys = Object.keys(sorts) as SortKey[];

// "open" (the default) hides models that are both finished and paid in full.
const scopes = ["open", "all"] as const;

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("models");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("phase");
  const tpay = await getTranslations("paymentStatus");
  const locale = await getLocale();

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
      <PageHeader title={tn("models")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createModel}>
        <ModelFields clients={clientRows} />
      </CreateModal>

      <ListFilters action="/models" activeCount={activeCount}>
        <FilterText name="q" label={tc("search")} defaultValue={q} placeholder={t("searchPlaceholder")} />
        <FilterSelect
          name="scope"
          label={t("show")}
          defaultValue={scope}
          options={scopes.map((s) => ({ value: s, label: t(`scope.${s}`) }))}
          allLabel={null}
        />
        <FilterSelect
          name="client"
          label={tc("client")}
          defaultValue={client ?? ""}
          options={[
            { value: "none", label: t("ownProject") },
            ...clientRows.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterSelect
          name="company"
          label={tc("company")}
          defaultValue={company}
          options={companyRows.map((r) => ({ value: r.company!, label: r.company! }))}
        />
        <FilterSelect
          name="phase"
          label={t("phase")}
          defaultValue={phase ?? ""}
          options={modelPhase.enumValues.map((p) => ({ value: p, label: tp(p) }))}
        />
        <FilterSelect
          name="payment"
          label={t("payment")}
          defaultValue={payment ?? ""}
          options={paymentStatus.enumValues.map((p) => ({ value: p, label: tpay(p) }))}
        />
        <FilterSelect
          name="sort"
          label={tc("sortBy")}
          defaultValue={sort}
          options={sortKeys.map((k) => ({ value: k, label: t(`sort.${k}`) }))}
          allLabel={null}
        />
      </ListFilters>

      <Card className="py-0!">
        <ul className="flex flex-col">
          {rows.length === 0 && (
            <li className="text-muted">
              {hasUserFilters
                ? t("emptyFiltered")
                : scope === "open"
                  ? t("emptyOpen")
                  : t("empty")}
            </li>
          )}
          {rows.map(({ model: m, clientName }) => (
            <li key={m.id} className={`${listItemClass} flex flex-col gap-3`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/models/${m.id}`} className="font-bold hover:underline">
                    {m.name}
                  </Link>
                  <p className="text-[13px] font-semibold text-brand">{clientName ?? t("ownProject")}</p>
                  <p className="text-[13px] text-muted">
                    {m.company ? `${m.company} · ` : ""}
                    {formatEuros(m.priceCents, locale)}
                  </p>
                  <p className="text-[13px] text-muted">
                    {t("dates", {
                      requested: formatDate(m.requestedDate, locale),
                      estimated: formatDate(m.estimatedDate, locale),
                    })}
                  </p>
                </div>
                <div className="-mt-1 flex shrink-0 items-center">
                  <EditIconLink href={`/models/${m.id}/edit`} label={tc("edit")} />
                  <form action={deleteModel.bind(null, m.id)}>
                    <DeleteIconButton label={tc("delete")} />
                  </form>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <PhaseBadge phase={m.phase} />
                  <PaymentBadge status={m.paymentStatus} priceCents={m.priceCents} depositCents={m.depositCents} />
                </div>
                <PhaseProgress phase={m.phase} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
