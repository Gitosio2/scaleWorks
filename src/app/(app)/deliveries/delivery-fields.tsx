import { useTranslations } from "next-intl";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = {
  name?: string;
  carrier?: string | null;
  trackingUrl?: string | null;
};

export function DeliveryFields({ defaults = {} }: { defaults?: Defaults }) {
  const t = useTranslations("deliveries");
  return (
    <>
      <label className={labelClass}>
        {t("name")}
        <input name="name" placeholder={t("namePlaceholder")} required defaultValue={defaults.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("carrier")}
        <input name="carrier" placeholder={t("carrierPlaceholder")} defaultValue={defaults.carrier ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("trackingUrl")}
        <input name="trackingUrl" type="url" placeholder="https://…" defaultValue={defaults.trackingUrl ?? ""} className={inputClass} />
      </label>
    </>
  );
}
