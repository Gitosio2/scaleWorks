import Link from "next/link";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { collectionListHref } from "@/lib/collection-filters";
import { collectionStats, type RankedEntry } from "@/lib/collection-stats";
import { countryName } from "@/lib/countries";
import { RESET_PARAM } from "@/lib/filter-reset";
import { formatEuros, formatPercent } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { RankedList, type RankedItem } from "@/components/ui/ranked-list";
import { linkActionClass } from "@/components/ui/styles";

// Figures of the user's own collection (private). The numbers come from
// collectionStats; this page only fetches the rows and lays the figures out.
export default async function CollectionDashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("collectionDashboard");
  const tn = await getTranslations("nav");
  const ttype = await getTranslations("modelType");
  const tcond = await getTranslations("collectionCondition");
  const locale = await getLocale();

  // Only the columns the figures need, for every item of the user (sold ones too:
  // collectionStats tells them apart).
  const rows = await db
    .select({
      id: collectionItems.id,
      brand: collectionItems.brand,
      name: collectionItems.name,
      manufacturer: collectionItems.manufacturer,
      type: collectionItems.type,
      country: collectionItems.country,
      condition: collectionItems.condition,
      customized: collectionItems.customized,
      gift: collectionItems.gift,
      purchasePriceCents: collectionItems.purchasePriceCents,
      estimatedValueCents: collectionItems.estimatedValueCents,
      purchaseDate: collectionItems.purchaseDate,
      soldPriceCents: collectionItems.soldPriceCents,
      soldDate: collectionItems.soldDate,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, user.id));

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title={tn("collectionDashboard")} subtitle={t("subtitle")} />
        <Card>
          <p className="text-muted">{t("empty")}</p>
          <Link href="/collection/list" className={`${linkActionClass} self-start`}>
            {t("goToList")}
          </Link>
        </Card>
      </>
    );
  }

  const stats = collectionStats(rows, {
    locale,
    labels: {
      type: (value) => ttype(value as Parameters<typeof ttype>[0]),
      country: (code) => countryName(code, locale),
    },
  });

  const count = (n: number) => t("rowCount", { count: n });
  // One row per ranking entry, linked to the list filtered by that entry.
  const ranking = (
    entries: readonly RankedEntry[],
    filter: (key: string) => Parameters<typeof collectionListHref>[0],
    icon?: (entry: RankedEntry) => React.ReactNode,
  ): RankedItem[] =>
    entries.map((entry) => ({
      id: entry.key,
      label: entry.label,
      value: count(entry.count),
      detail: formatPercent(entry.share, locale),
      share: entry.share,
      href: collectionListHref(filter(entry.key)),
      icon: icon?.(entry),
    }));

  const busiestYear = Math.max(...stats.purchaseYears.map((y) => y.count), 1);

  return (
    <>
      <PageHeader title={tn("collectionDashboard")} subtitle={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          value={stats.models}
          label={t("models")}
          hint={t("modelsHint")}
          href={`${collectionListHref({})}?${RESET_PARAM}=1`}
        />
        <KpiCard value={formatEuros(stats.totalCostCents, locale)} label={t("totalCost")} hint={t("totalCostHint")} />
        <KpiCard
          value={formatEuros(stats.averageCents, locale)}
          label={t("average")}
          hint={stats.pricedCount > 0 ? t("averageHint", { count: stats.pricedCount }) : t("averageNone")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RankedList
          title={t("topBrands")}
          empty={t("noData")}
          items={ranking(stats.topBrands, (brand) => ({ brand }))}
        />
        <RankedList
          title={t("topManufacturers")}
          empty={t("noData")}
          items={ranking(stats.topManufacturers, (manufacturer) => ({ manufacturer }))}
        />
        <RankedList
          title={t("topTypes")}
          empty={t("noData")}
          items={ranking(stats.topTypes, (type) => ({ type }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard value={stats.giftCount} label={t("gifts")} />
        <KpiCard value={stats.customizedCount} label={t("customized")} />
        <KpiCard
          value={formatEuros(stats.mostExpensive?.priceCents ?? null, locale)}
          label={t("mostExpensive")}
          hint={stats.mostExpensive && modelTitle(stats.mostExpensive.brand, stats.mostExpensive.name)}
          href={stats.mostExpensive ? `/collection/${stats.mostExpensive.id}` : undefined}
        />
        <KpiCard
          value={stats.sold.count}
          label={t("sold", { count: stats.sold.count })}
          hint={
            stats.sold.profitCents !== null
              ? t("soldProfit", { amount: formatEuros(stats.sold.profitCents, locale) })
              : t("soldNote")
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RankedList
          title={t("topCountries")}
          empty={t("noData")}
          items={ranking(
            stats.topCountries,
            (country) => ({ country }),
            (entry) => <CountryFlag code={entry.key} name={entry.label} iconOnly />,
          )}
        />
        <RankedList
          title={t("conditions")}
          empty={t("noData")}
          numbered={false}
          items={stats.conditions.map((c) => ({
            id: c.key,
            label: tcond(c.key),
            value: count(c.count),
            detail: formatPercent(c.share, locale),
            share: c.share,
          }))}
        />
        <RankedList
          title={t("purchaseYears")}
          empty={t("noData")}
          numbered={false}
          items={stats.purchaseYears.map((y) => ({
            id: String(y.year),
            label: String(y.year),
            value: count(y.count),
            detail: formatEuros(y.spentCents, locale),
            share: y.count / busiestYear,
          }))}
        />
      </div>
    </>
  );
}
