import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { isSold, profitCents } from "@/lib/collection";
import { countryName } from "@/lib/countries";
import { todayInMadrid } from "@/lib/dates";
import { isUuid } from "@/lib/input";
import { formatDate, formatEuros } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EditModal } from "@/components/ui/edit-modal";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChips } from "@/components/ui/tag-chips";
import { deleteCollectionItem, updateCollectionItem } from "../actions";
import { CollectionFields } from "../collection-fields";
import { CollectionPhotosSection } from "./photos-section";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export default async function CollectionItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!isUuid(id)) notFound();
  const t = await getTranslations("collection");
  const tc = await getTranslations("common");
  const ttype = await getTranslations("modelType");
  const tcond = await getTranslations("collectionCondition");
  const locale = await getLocale();

  const [item] = await db
    .select()
    .from(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.userId, user.id)));
  if (!item) notFound();

  const title = modelTitle(item.brand, item.name);
  const profit = profitCents(item);
  const none = tc("noValue");

  return (
    <>
      <BackLink href="/collection/list">{t("back")}</BackLink>
      <PageHeader
        title={title}
        subtitle={[item.company, item.year, tcond(item.condition)].filter(Boolean).join(" · ")}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {item.gift && <StatusBadge variant="info">{t("gift")}</StatusBadge>}
            {isSold(item) && <StatusBadge variant="mute">{t("sold")}</StatusBadge>}
            <EditModal label={tc("edit")} title={t("editTitle")} submitLabel={tc("save")} action={updateCollectionItem.bind(null, id)}>
              <CollectionFields defaults={item} />
            </EditModal>
            <ConfirmDelete
              label={tc("delete")}
              title={t("deleteTitle")}
              message={t("deleteMessage", { name: title })}
              action={deleteCollectionItem.bind(null, id)}
            />
          </div>
        }
      />

      <TagChips type={item.type} tags={item.tags} />

      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Detail label={t("brand")}>{item.brand}</Detail>
          <Detail label={t("modelName")}>{item.name}</Detail>
          <Detail label={t("company")}>{item.company ?? none}</Detail>
          <Detail label={t("country")}>{item.country ? countryName(item.country, locale) : none}</Detail>
          <Detail label={t("manufacturer")}>{item.manufacturer ?? none}</Detail>
          <Detail label={t("reference")}>{item.reference ?? none}</Detail>
          <Detail label={t("type")}>{item.type ? ttype(item.type) : none}</Detail>
          <Detail label={t("year")}>{item.year ?? none}</Detail>
          <Detail label={t("customized")}>{item.customized ? t("yes") : t("no")}</Detail>
          <Detail label={t("gift")}>{item.gift ? t("yes") : t("no")}</Detail>
          <Detail label={t("condition")}>{tcond(item.condition)}</Detail>
          <Detail label={t("purchasePrice")}>{formatEuros(item.purchasePriceCents, locale)}</Detail>
          <Detail label={t("purchaseDate")}>{formatDate(item.purchaseDate, locale)}</Detail>
          <Detail label={t("estimatedValue")}>
            {formatEuros(item.estimatedValueCents, locale)}
            {item.estimatedValueAt && (
              <span className="block text-[13px] font-normal text-muted">
                {t("estimatedAt", { date: formatDate(todayInMadrid(item.estimatedValueAt), locale) })}
              </span>
            )}
          </Detail>
          {isSold(item) && (
            <>
              <Detail label={t("soldDate")}>{formatDate(item.soldDate, locale)}</Detail>
              <Detail label={t("soldPrice")}>{formatEuros(item.soldPriceCents, locale)}</Detail>
              <Detail label={t("profitLabel")}>
                {profit === null ? (
                  none
                ) : (
                  <span className={profit < 0 ? "text-danger" : "text-ok"}>{formatEuros(profit, locale)}</span>
                )}
              </Detail>
            </>
          )}
        </dl>
        {item.notes && (
          <div className="flex flex-col gap-0.5 border-t border-line-soft pt-4">
            <span className="text-[13px] text-muted">{t("notes")}</span>
            <p className="whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}
      </Card>

      <CollectionPhotosSection itemId={id} itemName={title} userId={user.id} />
    </>
  );
}
