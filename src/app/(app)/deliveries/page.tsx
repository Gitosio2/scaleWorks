import Link from "next/link";
import { desc, eq, and, isNotNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumables, deliveries, parts, stockComponents } from "@/db/schema";
import { deliveryState } from "@/lib/delivery";
import { enumParam, type SearchParams } from "@/lib/list-filters";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateModal } from "@/components/ui/create-modal";
import { FilterSelect, ListFilters } from "@/components/ui/list-filters";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { listItemClass, primaryButtonClass } from "@/components/ui/styles";
import { createDelivery, markDelivered } from "./actions";
import { DeliveryFields } from "./delivery-fields";
import { DeliveryStateBadge } from "./state-badge";

const filters = ["open", "delivered", "all"] as const;

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("deliveries");
  const tn = await getTranslations("nav");
  const filter = enumParam(sp, "state", filters) ?? "open";

  const [rows, p, c, s] = await Promise.all([
    db.select().from(deliveries).where(eq(deliveries.userId, user.id)).orderBy(desc(deliveries.createdAt)),
    db.select({ id: parts.deliveryId, status: parts.status }).from(parts).where(and(eq(parts.userId, user.id), isNotNull(parts.deliveryId))),
    db.select({ id: consumables.deliveryId, status: consumables.status }).from(consumables).where(and(eq(consumables.userId, user.id), isNotNull(consumables.deliveryId))),
    db.select({ id: stockComponents.deliveryId, status: stockComponents.status }).from(stockComponents).where(and(eq(stockComponents.userId, user.id), isNotNull(stockComponents.deliveryId))),
  ]);

  const statuses = new Map<string, Array<(typeof p)[number]["status"]>>();
  for (const line of [...p, ...c, ...s]) {
    const list = statuses.get(line.id!) ?? [];
    list.push(line.status);
    statuses.set(line.id!, list);
  }

  const items = rows
    .map((d) => {
      const lines = statuses.get(d.id) ?? [];
      return {
        d,
        state: deliveryState(lines),
        total: lines.length,
        done: lines.filter((x) => x === "in_hand").length,
      };
    })
    .filter(({ state }) =>
      filter === "all" ? true : filter === "delivered" ? state === "delivered" : state !== "delivered",
    );

  return (
    <>
      <PageHeader title={tn("deliveries")} subtitle={t("subtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createDelivery}>
        <DeliveryFields />
      </CreateModal>

      <ListFilters action="/deliveries" activeCount={filter === "open" ? 0 : 1}>
        <FilterSelect
          name="state"
          label={t("filter.label")}
          defaultValue={filter}
          options={filters.map((k) => ({ value: k, label: t(`filter.${k}`) }))}
          allLabel={null}
        />
      </ListFilters>

      <Card className="py-0!">
        <ul className="flex flex-col">
          {items.length === 0 && (
            <li className="text-muted">{filter === "open" && rows.length === 0 ? t("empty") : t("emptyFiltered")}</li>
          )}
          {items.map(({ d, state, total, done }) => (
            <li key={d.id} className={`${listItemClass} flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
              <div className="min-w-0">
                <Link href={`/deliveries/${d.id}`} className="font-bold hover:underline">
                  {d.name}
                </Link>
                <p className="text-[13px] text-muted">
                  {[d.carrier, total > 0 ? t("progress", { done, total }) : null].filter(Boolean).join(" · ") || "—"}
                </p>
                {d.trackingUrl && (
                  <a href={d.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-brand hover:underline">
                    {t("track")}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <DeliveryStateBadge state={state} />
                {(state === "pending" || state === "partial") && (
                  <form action={markDelivered.bind(null, d.id)}>
                    <SubmitButton className={primaryButtonClass}>{t("markDelivered")}</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
