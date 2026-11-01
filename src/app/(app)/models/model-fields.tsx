import { useTranslations } from "next-intl";
import { modelPhase, paymentStatus } from "@/db/schema";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  name?: string;
  company?: string | null;
  clientId?: string | null;
  priceCents?: number | null;
  phase?: (typeof modelPhase.enumValues)[number];
  paymentStatus?: (typeof paymentStatus.enumValues)[number];
  depositCents?: number | null;
  requestedDate?: string | null;
  estimatedDate?: string | null;
};

export function ModelFields({
  clients,
  defaults = {},
}: {
  clients: { id: string; name: string }[];
  defaults?: Defaults;
}) {
  const t = useTranslations("models");
  const tc = useTranslations("common");
  const tp = useTranslations("phase");
  const tpay = useTranslations("paymentStatus");
  return (
    <>
      <label className={labelClass}>
        {t("modelName")}
        <input name="name" placeholder={t("modelName")} required defaultValue={defaults.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        {tc("company")}
        <input
          name="company"
          placeholder={t("companyPlaceholder")}
          defaultValue={defaults.company ?? ""}
          className={inputClass}
        />
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
        {t("paymentStatus")}
        <select name="paymentStatus" defaultValue={defaults.paymentStatus ?? "none"} className={inputClass}>
          {paymentStatus.enumValues.map((p) => (
            <option key={p} value={p}>{tpay(p)}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {t("deposit")}
        <input
          name="deposit"
          inputMode="decimal"
          placeholder={tc("moneyPlaceholder")}
          defaultValue={defaults.depositCents != null ? (defaults.depositCents / 100).toFixed(2) : ""}
          className={inputClass}
        />
        <span className="text-xs font-normal text-muted">{t("depositHelp")}</span>
      </label>
      <label className={labelClass}>
        {t("phase")}
        <select name="phase" defaultValue={defaults.phase ?? "not_started"} className={inputClass}>
          {modelPhase.enumValues.map((p) => (
            <option key={p} value={p}>{tp(p)}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {t("requestedDate")}
        <input name="requestedDate" type="date" defaultValue={defaults.requestedDate ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("estimatedDate")}
        <input name="estimatedDate" type="date" defaultValue={defaults.estimatedDate ?? ""} className={inputClass} />
      </label>
    </>
  );
}
