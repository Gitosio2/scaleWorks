import { useLocale, useTranslations } from "next-intl";
import { supplyStatus } from "@/db/schema";
import type { parts } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import { CollapsibleCard } from "@/components/ui/card";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import { DeleteIconButton, PaidCheckButton } from "@/components/ui/icon-actions";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  inputClass,
  labelClass,
  listItemClass,
  primaryButtonClass,
} from "@/components/ui/styles";

type Part = typeof parts.$inferSelect;

// Shared by models and quotes. The owner-specific server actions come in as
// props, already bound to the owning model or quote.
export function PartsSection({
  parts: rows,
  add,
  updateStatus,
  remove,
  setPaid,
}: {
  parts: Part[];
  add: (formData: FormData) => Promise<void>;
  updateStatus: (partId: string, status: string) => Promise<void>;
  remove: (partId: string) => Promise<void>;
  // Only models track payment; quotes leave this out and show no paid check.
  setPaid?: (partId: string, paid: boolean) => Promise<void>;
}) {
  const t = useTranslations("parts");
  const tc = useTranslations("common");
  const ts = useTranslations("supplyStatus");
  const locale = useLocale();
  const totalCents = rows.reduce((acc, p) => acc + (p.priceCents ?? 0), 0);
  const pair = `${labelClass} min-w-40 flex-1`;
  const statusOptions = supplyStatus.enumValues.map((s) => ({
    value: s as string,
    label: ts(s),
    variant: supplyStatusVariant(s),
  }));

  return (
    <CollapsibleCard title={t("title", { total: formatEuros(totalCents, locale) })}>

      <form action={add} className="flex flex-col gap-3">
        <label className={labelClass}>
          {tc("description")}
          <input name="description" placeholder={tc("description")} required className={inputClass} />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className={pair}>
            {tc("brand")}
            <input name="brand" placeholder={tc("brand")} className={inputClass} />
          </label>
          <label className={pair}>
            {tc("reference")}
            <input name="reference" placeholder={tc("reference")} className={inputClass} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className={pair}>
            {tc("price")}
            <input name="price" inputMode="decimal" placeholder={tc("price")} className={inputClass} />
          </label>
          <label className={pair}>
            {tc("store")}
            <input name="store" placeholder={tc("store")} className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          {t("storeLink")}
          <input name="url" type="url" placeholder={t("storeLinkPlaceholder")} className={inputClass} />
        </label>
        <label className={labelClass}>
          {tc("status")}
          <select name="status" defaultValue="to_order" className={inputClass}>
            {supplyStatus.enumValues.map((s) => (
              <option key={s} value={s}>{ts(s)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${primaryButtonClass} self-start`}>
          {t("add")}
        </button>
      </form>

      <ul className="flex flex-col">
        {rows.length === 0 && <li className="py-4 text-muted">{t("empty")}</li>}
        {rows.map((p) => (
          <li key={p.id} className={`${listItemClass} flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{p.description}</p>
                <p className="text-[13px] text-muted">
                  {[p.brand, p.reference].filter(Boolean).join(" · ") || tc("noValue")}
                  {" · "}
                  {formatEuros(p.priceCents, locale)}
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
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <StatusBadge variant={supplyStatusVariant(p.status)}>
                  {ts(p.status)}
                </StatusBadge>
                {setPaid && (
                  <>
                    {/* A part that is still "to order" is not owed yet, so only bought parts say if they are paid. */}
                    {p.status !== "to_order" && (
                      <StatusBadge variant={p.paid ? "ok" : "warn"}>
                        {p.paid ? t("paid") : t("unpaid")}
                      </StatusBadge>
                    )}
                    <form action={setPaid.bind(null, p.id, !p.paid)}>
                      <PaidCheckButton paid={p.paid} label={p.paid ? t("markUnpaid") : t("markPaid")} />
                    </form>
                  </>
                )}
                <form action={remove.bind(null, p.id)}>
                  <DeleteIconButton label={tc("delete")} />
                </form>
              </div>
            </div>
            <SegmentedToggle
              value={p.status}
              options={statusOptions}
              action={updateStatus.bind(null, p.id)}
              label={tc("status")}
            />
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}
