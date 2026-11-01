import { useLocale, useTranslations } from "next-intl";
import { supplyStatus } from "@/db/schema";
import type { parts } from "@/db/schema";
import { formatEuros } from "@/lib/labels";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusBadge, supplyStatusVariant } from "@/components/ui/status-badge";
import {
  dangerActionClass,
  inputClass,
  labelClass,
  linkActionClass,
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
}: {
  parts: Part[];
  add: (formData: FormData) => Promise<void>;
  updateStatus: (partId: string, formData: FormData) => Promise<void>;
  remove: (partId: string) => Promise<void>;
}) {
  const t = useTranslations("parts");
  const tc = useTranslations("common");
  const ts = useTranslations("supplyStatus");
  const locale = useLocale();
  const totalCents = rows.reduce((acc, p) => acc + (p.priceCents ?? 0), 0);
  const pair = `${labelClass} min-w-40 flex-1`;

  return (
    <Card>
      <CardTitle>{t("title", { total: formatEuros(totalCents, locale) })}</CardTitle>

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
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge variant={supplyStatusVariant(p.status)}>
                  {ts(p.status)}
                </StatusBadge>
                <form action={remove.bind(null, p.id)}>
                  <button type="submit" className={dangerActionClass}>{tc("delete")}</button>
                </form>
              </div>
            </div>
            <form action={updateStatus.bind(null, p.id)} className="flex flex-wrap items-center gap-2">
              <select name="status" defaultValue={p.status} aria-label={tc("status")} className={`${inputClass} text-sm`}>
                {supplyStatus.enumValues.map((s) => (
                  <option key={s} value={s}>{ts(s)}</option>
                ))}
              </select>
              <button type="submit" className={linkActionClass}>{t("updateStatus")}</button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
