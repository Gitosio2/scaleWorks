import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { collectionItems } from "@/db/schema";
import { isSold, profitCents } from "@/lib/collection";
import { hasPurchasePrice, rowMeta } from "@/lib/collection-row";
import { countryName } from "@/lib/countries";
import { formatEuros } from "@/lib/labels";
import { modelTitle } from "@/lib/model-title";
import { CountryFlag } from "@/components/ui/country-flag";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EditModal } from "@/components/ui/edit-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChips } from "@/components/ui/tag-chips";
import { listItemClass } from "@/components/ui/styles";
import { deleteCollectionItem, updateCollectionItem } from "./actions";
import { CollectionFields } from "./collection-fields";

// One row of the collection list, with its edit and delete actions.
export async function ListRow({ item }: { item: typeof collectionItems.$inferSelect }) {
  const t = await getTranslations("collection");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const profit = profitCents(item);
  const title = modelTitle(item.brand, item.name);
  const meta = rowMeta(item, (code) => countryName(code, locale));
  const purchase = hasPurchasePrice(item)
    ? t("purchaseShort", { amount: formatEuros(item.purchasePriceCents, locale) })
    : null;
  return (
    <li className={`${listItemClass} flex items-start justify-between gap-3`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link href={`/collection/${item.id}`} className="font-bold hover:underline">
          {title}
        </Link>
        {meta.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
            {meta.map((part, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && <span aria-hidden>·</span>}
                {part.kind === "country" ? <CountryFlag code={part.code} name={part.name} /> : part.text}
              </span>
            ))}
          </p>
        )}
        {purchase && <p className="text-[13px] text-muted sm:hidden">{purchase}</p>}
        <TagChips type={item.type} tags={item.tags} />
        {(isSold(item) || item.gift) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {item.gift && <StatusBadge variant="info">{t("gift")}</StatusBadge>}
            {isSold(item) && <StatusBadge variant="mute">{t("sold")}</StatusBadge>}
            {isSold(item) && profit !== null && (
              <span className="text-[13px] font-semibold text-ink-2">
                {t("profit", { amount: formatEuros(profit, locale) })}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="-mt-1 flex shrink-0 items-center gap-2">
        {purchase && <span className="hidden whitespace-nowrap text-[13px] text-muted sm:inline">{purchase}</span>}
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
}
