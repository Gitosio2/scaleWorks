import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { consumables, deliveries, parts, stockComponents, supplyStatus } from "@/db/schema";
import { deliveryState } from "@/lib/delivery";
import { isUuid } from "@/lib/input";
import { formatEuros } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EditModal } from "@/components/ui/edit-modal";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { supplyStatusVariant } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { listItemClass, primaryButtonClass } from "@/components/ui/styles";
import { ComponentFields } from "../../components/component-fields";
import { ConsumableFields } from "../../consumables/consumable-fields";
import { ExpenseFields } from "../../expenses/expense-fields";
import { AddLineButton } from "../add-line-button";
import { DeliveryFields } from "../delivery-fields";
import { DeliveryStateBadge } from "../state-badge";
import {
  addDeliveryComponent,
  addDeliveryConsumable,
  addDeliveryPart,
  deleteDelivery,
  deleteLine,
  markDelivered,
  setLineStatus,
  updateDelivery,
  updateDeliveryComponent,
  updateDeliveryConsumable,
  updateDeliveryPart,
  type LineKind,
} from "../actions";

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!isUuid(id)) notFound();
  const t = await getTranslations("deliveries");
  const tc = await getTranslations("common");
  const ts = await getTranslations("supplyStatus");
  const tcat = await getTranslations("consumableCategory");
  const locale = await getLocale();

  const [delivery] = await db
    .select()
    .from(deliveries)
    .where(and(eq(deliveries.id, id), eq(deliveries.userId, user.id)));
  if (!delivery) notFound();

  const [partRows, consumableRows, componentRows] = await Promise.all([
    db.select().from(parts).where(and(eq(parts.deliveryId, id), eq(parts.userId, user.id))).orderBy(asc(parts.description), asc(parts.id)),
    db.select().from(consumables).where(and(eq(consumables.deliveryId, id), eq(consumables.userId, user.id))).orderBy(asc(consumables.description), asc(consumables.id)),
    db.select().from(stockComponents).where(and(eq(stockComponents.deliveryId, id), eq(stockComponents.userId, user.id))).orderBy(asc(stockComponents.description), asc(stockComponents.id)),
  ]);

  type Line = {
    kind: LineKind;
    id: string;
    description: string;
    detail: string;
    status: (typeof supplyStatus.enumValues)[number];
    edit: React.ReactNode;
    editAction: (formData: FormData) => Promise<void>;
  };
  const money = (cents: number | null) => formatEuros(cents, locale);
  const lines: Line[] = [
    ...partRows.map((p) => ({
      kind: "part" as const,
      id: p.id,
      description: p.description,
      detail: [p.store, money(p.priceCents)].filter(Boolean).join(" · "),
      status: p.status,
      edit: <ExpenseFields defaults={p} />,
      editAction: updateDeliveryPart.bind(null, id, p.id),
    })),
    ...consumableRows.map((c) => ({
      kind: "consumable" as const,
      id: c.id,
      description: c.description,
      detail: [tcat(c.category), c.store, money(c.priceCents)].filter(Boolean).join(" · "),
      status: c.status,
      edit: <ConsumableFields defaults={c} />,
      editAction: updateDeliveryConsumable.bind(null, id, c.id),
    })),
    ...componentRows.map((c) => ({
      kind: "component" as const,
      id: c.id,
      description: c.description,
      detail: [`×${c.quantity}`, c.store, money(c.priceCents)].filter(Boolean).join(" · "),
      status: c.status,
      edit: <ComponentFields defaults={c} />,
      editAction: updateDeliveryComponent.bind(null, id, c.id),
    })),
  ];

  const state = deliveryState(lines.map((l) => l.status));
  const done = lines.filter((l) => l.status === "in_hand").length;
  const statusOptions = supplyStatus.enumValues.map((s) => ({
    value: s as string,
    label: ts(s),
    variant: supplyStatusVariant(s),
  }));

  return (
    <>
      <BackLink href="/deliveries">← {t("back")}</BackLink>
      <PageHeader
        title={delivery.name}
        subtitle={
          <>
            {[delivery.carrier, lines.length > 0 ? t("progress", { done, total: lines.length }) : null]
              .filter(Boolean)
              .join(" · ")}
            {delivery.trackingUrl && (
              <>
                {delivery.carrier || lines.length > 0 ? " · " : ""}
                <a href={delivery.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                  {t("track")}
                </a>
              </>
            )}
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DeliveryStateBadge state={state} />
            <EditModal label={tc("edit")} title={t("editTitle")} submitLabel={tc("save")} action={updateDelivery.bind(null, id)}>
              <DeliveryFields defaults={delivery} />
            </EditModal>
            <ConfirmDelete
              label={tc("delete")}
              title={t("deleteTitle")}
              message={t("deleteMessage", { name: delivery.name })}
              action={deleteDelivery.bind(null, id)}
            />
          </div>
        }
      />

      <Card>
        {state === "delivered" && <p className="text-[13px] text-muted">{t("deliveredHint")}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <AddLineButton label={t("addPart")} action={addDeliveryPart.bind(null, id)}>
            <ExpenseFields />
          </AddLineButton>
          <AddLineButton label={t("addConsumable")} action={addDeliveryConsumable.bind(null, id)}>
            <ConsumableFields defaults={{ status: "ordered" }} />
          </AddLineButton>
          <AddLineButton label={t("addComponent")} action={addDeliveryComponent.bind(null, id)}>
            <ComponentFields />
          </AddLineButton>
          {(state === "pending" || state === "partial") && (
            <form action={markDelivered.bind(null, id)} className="ml-auto">
              <SubmitButton className={primaryButtonClass}>{t("markDelivered")}</SubmitButton>
            </form>
          )}
        </div>
      </Card>

      <Card className="py-0!">
        <ul className="flex flex-col">
          {lines.length === 0 && <li className="text-muted">{t("linesEmpty")}</li>}
          {lines.map((l) => (
            <li key={`${l.kind}-${l.id}`} className={`${listItemClass} flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
              <div className="min-w-0">
                <p className={l.status === "in_hand" ? "font-bold text-muted" : "font-bold"}>{l.description}</p>
                <p className="text-[13px] text-muted">
                  {t(`kind.${l.kind}`)}
                  {l.detail && ` · ${l.detail}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <SegmentedToggle
                  value={l.status}
                  options={statusOptions}
                  action={setLineStatus.bind(null, id, l.kind, l.id)}
                  label={tc("status")}
                />
                <span className="min-w-16 text-[13px] font-semibold">{ts(l.status)}</span>
                <EditModal label={tc("edit")} title={t("editLine")} submitLabel={tc("save")} action={l.editAction}>
                  {l.edit}
                </EditModal>
                <ConfirmDelete
                  label={tc("delete")}
                  title={t("deleteLineTitle")}
                  message={t("deleteLineMessage", { name: l.description })}
                  action={deleteLine.bind(null, id, l.kind, l.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
