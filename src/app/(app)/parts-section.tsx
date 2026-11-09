import { useLocale, useTranslations } from "next-intl";
import { supplyStatus } from "@/db/schema";
import type { parts } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import { partCostCents } from "@/lib/part-cost";
import { SubmitButton } from "@/components/ui/submit-button";
import { CollapsibleCard } from "@/components/ui/card";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import { DeleteIconButton, PaidCheckButton } from "@/components/ui/icon-actions";
import { EditModal } from "@/components/ui/edit-modal";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  inputClass,
  labelClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";

// A part, plus the unit price of its stock component when it was taken from stock.
type Part = typeof parts.$inferSelect & { stockUnitPriceCents?: number | null };

// Status is edited through the toggle, so it is not part of these fields.
function PartFields({ defaults }: { defaults?: Part }) {
  const t = useTranslations("parts");
  const tc = useTranslations("common");
  const pair = `${labelClass} min-w-40 flex-1`;
  return (
    <>
      <label className={labelClass}>
        {tc("description")}
        <input name="description" placeholder={tc("description")} required defaultValue={defaults?.description} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={pair}>
          {tc("brand")}
          <input name="brand" placeholder={tc("brand")} defaultValue={defaults?.brand ?? ""} className={inputClass} />
        </label>
        <label className={pair}>
          {tc("reference")}
          <input name="reference" placeholder={tc("reference")} defaultValue={defaults?.reference ?? ""} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={pair}>
          {tc("price")}
          <input
            name="price"
            inputMode="decimal"
            placeholder={tc("price")}
            defaultValue={defaults?.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
            className={inputClass}
          />
        </label>
        <label className={pair}>
          {tc("store")}
          <input name="store" placeholder={tc("store")} defaultValue={defaults?.store ?? ""} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        {t("storeLink")}
        <input name="url" type="url" placeholder={t("storeLinkPlaceholder")} defaultValue={defaults?.url ?? ""} className={inputClass} />
      </label>
    </>
  );
}

// Shared by models and quotes. The owner-specific server actions come in as
// props, already bound to the owning model or quote.
export function PartsSection({
  parts: rows,
  add,
  update,
  updateStatus,
  remove,
  setPaid,
  updateStockQuantity,
}: {
  parts: Part[];
  add: (formData: FormData) => Promise<void>;
  update: (partId: string, formData: FormData) => Promise<void>;
  updateStatus: (partId: string, status: string) => Promise<void>;
  remove: (partId: string) => Promise<void>;
  // Only models track payment; quotes leave this out and show no paid check.
  setPaid?: (partId: string, paid: boolean) => Promise<void>;
  // Parts taken from stock only let their quantity change; quotes have none.
  updateStockQuantity?: (partId: string, formData: FormData) => Promise<void>;
}) {
  const t = useTranslations("parts");
  const tc = useTranslations("common");
  const ts = useTranslations("supplyStatus");
  const locale = useLocale();
  const costOf = (p: Part) =>
    partCostCents({
      priceCents: p.priceCents,
      stockUnitPriceCents: p.stockUnitPriceCents ?? null,
      quantity: p.quantity,
    });
  const totalCents = rows.reduce((acc, p) => acc + costOf(p), 0);
  const statusOptions = supplyStatus.enumValues.map((s) => ({
    value: s as string,
    label: ts(s),
    variant: supplyStatusVariant(s),
  }));

  return (
    <CollapsibleCard title={t("title", { total: formatEuros(totalCents, locale) })}>

      <form action={add} className="flex flex-col gap-3">
        <PartFields />
        <label className={labelClass}>
          {tc("status")}
          <select name="status" defaultValue="to_order" className={inputClass}>
            {supplyStatus.enumValues.map((s) => (
              <option key={s} value={s}>{ts(s)}</option>
            ))}
          </select>
        </label>
        <SubmitButton className={`${primaryButtonClass} self-start`}>{t("add")}</SubmitButton>
      </form>

      <ul className="flex flex-col">
        {rows.length === 0 && <li className="py-4 text-muted">{t("empty")}</li>}
        {/* A grid so that on a phone the status slider sits under the text, in the space the taller block at the right leaves empty. */}
        {rows.map((p) => (
          <li key={p.id} className={`${listItemClass} grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-3 gap-y-2 sm:grid-rows-none`}>
            <div className="min-w-0 self-start">
              <p className="font-bold">{p.description}</p>
              <p className="text-[13px] text-muted">
                {[p.brand, p.reference].filter(Boolean).join(" · ") || tc("noValue")}
                {" · "}
                {p.stockComponentId !== null && p.quantity !== null
                  ? t("stockSummary", {
                      quantity: p.quantity,
                      unit: formatEuros(p.stockUnitPriceCents ?? 0, locale),
                      total: formatEuros(costOf(p), locale),
                    })
                  : formatEuros(p.priceCents, locale)}
              </p>
              <p className="text-[13px] text-muted">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                    {p.store ?? t("storeLink")}
                  </a>
                ) : (
                  (p.store ?? t("noStore"))
                )}
              </p>
            </div>
            {/* On a phone this block is a narrow column at the right (icons, then the badges stacked) so the text keeps its room; from sm on it is one row, badges first. */}
            <div className="row-span-2 flex flex-col items-end gap-2 self-start sm:row-span-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex flex-col items-end gap-2 max-sm:order-2 sm:flex-row sm:items-center">
                {p.stockComponentId !== null ? (
                  <StatusBadge variant="ok">{t("fromStock")}</StatusBadge>
                ) : (
                  <StatusBadge variant={supplyStatusVariant(p.status)}>
                    {ts(p.status)}
                  </StatusBadge>
                )}
                {/* A part still "to order" is not owed yet, so only bought parts show or change their payment. Stock parts are already bought and paid. */}
                {setPaid && p.stockComponentId === null && p.status !== "to_order" && (
                  <StatusBadge variant={p.paid ? "ok" : "warn"}>
                    {p.paid ? t("paid") : t("unpaid")}
                  </StatusBadge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {setPaid && p.stockComponentId === null && p.status !== "to_order" && (
                  <form action={setPaid.bind(null, p.id, !p.paid)}>
                    <PaidCheckButton paid={p.paid} label={p.paid ? t("markUnpaid") : t("markPaid")} />
                  </form>
                )}
                {p.stockComponentId !== null ? (
                  updateStockQuantity && (
                    <EditModal
                      label={tc("edit")}
                      title={t("stockEditTitle")}
                      submitLabel={tc("save")}
                      action={updateStockQuantity.bind(null, p.id)}
                    >
                      <label className={labelClass}>
                        {t("quantity")}
                        <input
                          name="quantity"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          required
                          defaultValue={p.quantity ?? 1}
                          className={inputClass}
                        />
                      </label>
                    </EditModal>
                  )
                ) : (
                  <EditModal
                    label={tc("edit")}
                    title={t("editTitle")}
                    submitLabel={tc("save")}
                    action={update.bind(null, p.id)}
                  >
                    <PartFields defaults={p} />
                  </EditModal>
                )}
                <form action={remove.bind(null, p.id)}>
                  <DeleteIconButton label={tc("delete")} />
                </form>
              </div>
            </div>
            {p.stockComponentId === null && (
              <div className="sm:col-span-2">
                <SegmentedToggle
                  value={p.status}
                  options={statusOptions}
                  action={updateStatus.bind(null, p.id)}
                  label={tc("status")}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}
