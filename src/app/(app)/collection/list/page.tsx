import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { isSold, profitCents } from "@/lib/collection";
import { hasPurchasePrice, rowMeta } from "@/lib/collection-row";
import { countryName } from "@/lib/countries";
import { formatEuros } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { CreateModal } from "@/components/ui/create-modal";
import { EditModal } from "@/components/ui/edit-modal";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChips } from "@/components/ui/tag-chips";
import { listItemClass } from "@/components/ui/styles";
import { createCollectionItem, deleteCollectionItem, updateCollectionItem } from "../actions";
import { CollectionFields } from "../collection-fields";

// Text-only list of the collection (private for now).
export default async function CollectionListPage() {
  const user = await requireUser();
  const t = await getTranslations("collection");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const locale = await getLocale();

  // Whole rows: the edit modal of each item is prefilled from them.
  const items = await db
    .select()
    .from(collectionItems)
    .where(eq(collectionItems.userId, user.id))
    .orderBy(desc(collectionItems.createdAt));

  return (
    <>
      <PageHeader title={tn("collectionList")} subtitle={t("listSubtitle")} />

      <CreateModal label={t("add")} title={t("add")} action={createCollectionItem}>
        <CollectionFields />
      </CreateModal>

      <Card className="py-0!">
        <ul className="flex flex-col">
          {items.length === 0 && <li className="py-4 text-muted">{t("empty")}</li>}
          {items.map((item) => {
            const profit = profitCents(item);
            const title = modelTitle(item.brand, item.name);
            const meta = rowMeta(item, (code) => countryName(code, locale));
            const purchase = hasPurchasePrice(item)
              ? t("purchaseShort", { amount: formatEuros(item.purchasePriceCents, locale) })
              : null;
            return (
              <li key={item.id} className={`${listItemClass} flex items-start justify-between gap-3`}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/collection/${item.id}`} className="font-bold hover:underline">
                    {title}
                  </Link>
                  {meta.length > 0 && (
                    <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
                      {meta.map((part, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5">
                          {index > 0 && <span aria-hidden>·</span>}
                          {part.kind === "country" ? (
                            <CountryFlag code={part.code} name={part.name} />
                          ) : (
                            part.text
                          )}
                        </span>
                      ))}
                    </p>
                  )}
                  {purchase && <p className="text-[13px] text-muted sm:hidden">{purchase}</p>}
                  <TagChips type={item.type} tags={item.tags} />
                  {isSold(item) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <StatusBadge variant="mute">{t("sold")}</StatusBadge>
                      {profit !== null && (
                        <span className="text-[13px] font-semibold text-ink-2">
                          {t("profit", { amount: formatEuros(profit, locale) })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="-mt-1 flex shrink-0 items-center gap-2">
                  {purchase && (
                    <span className="hidden whitespace-nowrap text-[13px] text-muted sm:inline">{purchase}</span>
                  )}
                  <EditModal
                    label={tc("edit")}
                    title={t("editTitle")}
                    submitLabel={tc("save")}
                    action={updateCollectionItem.bind(null, item.id)}
                  >
                    <CollectionFields defaults={item} />
                  </EditModal>
                  <ConfirmDelete
                    label={tc("delete")}
                    title={t("deleteTitle")}
                    message={t("deleteMessage", { name: title })}
                    action={deleteCollectionItem.bind(null, item.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
