import { useTranslations } from "next-intl";
import { quoteStatus } from "@/db/schema";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  title?: string;
  clientId?: string | null;
  priceCents?: number | null;
  status?: (typeof quoteStatus.enumValues)[number];
};

export function QuoteFields({
  clients,
  defaults = {},
}: {
  clients: { id: string; name: string }[];
  defaults?: Defaults;
}) {
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const tq = useTranslations("quoteStatus");
  return (
    <>
      <label className={labelClass}>
        {t("title")}
        <input name="title" placeholder={t("titlePlaceholder")} required defaultValue={defaults.title} className={inputClass} />
      </label>
      <label className={labelClass}>
        {tc("client")}
        <select name="clientId" defaultValue={defaults.clientId ?? ""} className={inputClass}>
          <option value="">{t("noClientOption")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {tc("price")}
        <input
          name="price"
          inputMode="decimal"
          placeholder={tc("moneyPlaceholder")}
          defaultValue={defaults.priceCents != null ? (defaults.priceCents / 100).toFixed(2) : ""}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {tc("status")}
        <select name="status" defaultValue={defaults.status ?? "open"} className={inputClass}>
          {quoteStatus.enumValues.map((s) => (
            <option key={s} value={s}>{tq(s)}</option>
          ))}
        </select>
      </label>
    </>
  );
}
