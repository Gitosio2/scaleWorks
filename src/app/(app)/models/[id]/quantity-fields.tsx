import { useTranslations } from "next-intl";
import { inputClass } from "@/components/ui/styles";

const QUICK = ["1/16", "1/8", "1/4", "1/2"] as const;

export function QuantityFields({ defaultQuick = "" }: { defaultQuick?: string }) {
  const t = useTranslations("models.quantity");
  return (
    <>
      <select name="quantity" defaultValue={defaultQuick} aria-label={t("label")} className={inputClass}>
        <option value="">{t("optional")}</option>
        {QUICK.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
        <option value="1">{t("oneUnit")}</option>
      </select>
      <input
        name="quantityCustom"
        placeholder={t("customPlaceholder")}
        aria-label={t("customLabel")}
        className={`${inputClass} w-44`}
      />
    </>
  );
}
