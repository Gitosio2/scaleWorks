import { useLocale, useTranslations } from "next-intl";
import { collectionCondition, modelType } from "@/db/schema";
import { TypeAndTags } from "@/components/type-and-tags";
import { inputClass, labelClass } from "@/components/ui/styles";
import { TAGS_BY_TYPE } from "@/lib/tags";
import { countryOptions } from "@/lib/countries";

export type CollectionDefaults = {
  brand?: string;
  name?: string;
  company?: string | null;
  country?: string | null;
  manufacturer?: string | null;
  reference?: string | null;
  type?: (typeof modelType.enumValues)[number] | null;
  tags?: readonly string[];
  year?: number | null;
  customized?: boolean;
  gift?: boolean;
  condition?: (typeof collectionCondition.enumValues)[number];
  purchasePriceCents?: number | null;
  purchaseDate?: string | null;
  estimatedValueCents?: number | null;
  soldDate?: string | null;
  soldPriceCents?: number | null;
  notes?: string | null;
};

const euros = (cents: number | null | undefined) => (cents != null ? (cents / 100).toFixed(2) : "");

// Form for a collection item (create or edit): identity, then acquisition, value,
// sale, notes. Pass `defaults` to prefill it when editing.
export function CollectionFields({ defaults = {} }: { defaults?: CollectionDefaults }) {
  const t = useTranslations("collection");
  const tc = useTranslations("common");
  const tcond = useTranslations("collectionCondition");
  const locale = useLocale();
  return (
    <>
      <label className={labelClass}>
        {t("brand")}
        <input name="brand" required defaultValue={defaults.brand} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("modelName")}
        <input name="name" required defaultValue={defaults.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("company")}
        <input name="company" defaultValue={defaults.company ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("country")}
        <select name="country" defaultValue={defaults.country ?? ""} className={inputClass}>
          <option value="">{t("noCountry")}</option>
          {countryOptions(locale).map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {t("manufacturer")}
        <input name="manufacturer" defaultValue={defaults.manufacturer ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("reference")}
        <input name="reference" defaultValue={defaults.reference ?? ""} className={inputClass} />
      </label>
      <TypeAndTags
        types={modelType.enumValues}
        tagsByType={TAGS_BY_TYPE}
        typeLabel={t("type")}
        noTypeLabel={t("noType")}
        tagsLabel={t("tags")}
        defaultType={defaults.type ?? null}
        defaultTags={defaults.tags ?? []}
      />
      <label className={labelClass}>
        {t("year")}
        <input name="year" inputMode="numeric" defaultValue={defaults.year ?? ""} className={inputClass} />
      </label>
      <label className="flex min-h-11 items-center gap-2.5 text-[13px] font-semibold text-ink-2">
        <input type="checkbox" name="customized" defaultChecked={defaults.customized ?? false} className="size-5" />
        {t("customized")}
      </label>
      <label className="flex min-h-11 items-center gap-2.5 text-[13px] font-semibold text-ink-2">
        <input type="checkbox" name="gift" defaultChecked={defaults.gift ?? false} className="size-5" />
        {t("gift")}
      </label>
      <label className={labelClass}>
        {t("condition")}
        <select name="condition" defaultValue={defaults.condition ?? "new"} className={inputClass}>
          {collectionCondition.enumValues.map((v) => (
            <option key={v} value={v}>{tcond(v)}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {t("purchasePrice")}
        <input
          name="purchasePrice"
          inputMode="decimal"
          placeholder={tc("moneyPlaceholder")}
          defaultValue={euros(defaults.purchasePriceCents)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {t("purchaseDate")}
        <input name="purchaseDate" type="date" defaultValue={defaults.purchaseDate ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("estimatedValue")}
        <input
          name="estimatedValue"
          inputMode="decimal"
          placeholder={tc("moneyPlaceholder")}
          defaultValue={euros(defaults.estimatedValueCents)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {t("soldDate")}
        <input name="soldDate" type="date" defaultValue={defaults.soldDate ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("soldPrice")}
        <input
          name="soldPrice"
          inputMode="decimal"
          placeholder={tc("moneyPlaceholder")}
          defaultValue={euros(defaults.soldPriceCents)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {t("notes")}
        <textarea name="notes" rows={3} defaultValue={defaults.notes ?? ""} className={`${inputClass} py-2`} />
      </label>
    </>
  );
}
