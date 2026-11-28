import Link from "next/link";
import { modelTitle } from "@/lib/model-title";
import { Photo } from "@/components/ui/photo";
import { captionClass, cx } from "@/components/ui/styles";
import type { GalleryItem } from "./queries";

// One card of the collection gallery: the cover photo, then the brand as a small
// caption over the model name. Without a brand the name is the whole title, as
// in modelTitle. The space between the two lines keeps the link text readable.
export function GalleryCard({ item }: { item: GalleryItem }) {
  const title = modelTitle(item.brand, item.name);
  const brand = item.brand?.trim();
  return (
    <li>
      <Link href={`/collection/${item.id}`} className="group flex flex-col gap-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] border border-line bg-canvas group-hover:border-ink">
          {item.coverId && (
            <Photo
              src={`/img/collection/${item.coverId}/thumb`}
              alt={title}
              className="transition-transform group-hover:scale-[1.03]"
            />
          )}
        </div>
        <span title={title} className="flex min-w-0 flex-col px-3">
          {brand && (
            <span className={cx("truncate", captionClass)}>
              {brand}
            </span>
          )}{" "}
          <span className="truncate font-display text-[22px] font-bold leading-tight underline-offset-4 group-hover:underline">
            {item.name}
          </span>
        </span>
      </Link>
    </li>
  );
}
