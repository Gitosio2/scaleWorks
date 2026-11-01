import { useTranslations } from "next-intl";
import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = { name?: string; contact?: string | null; company?: string | null };

export function ClientFields({ defaults = {} }: { defaults?: Defaults }) {
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  return (
    <>
      <label className={labelClass}>
        {tc("name")}
        <input name="name" placeholder={tc("name")} required defaultValue={defaults.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("contact")}
        <input name="contact" placeholder={t("contactPlaceholder")} defaultValue={defaults.contact ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {tc("company")}
        <input name="company" placeholder={t("companyPlaceholder")} defaultValue={defaults.company ?? ""} className={inputClass} />
      </label>
    </>
  );
}
