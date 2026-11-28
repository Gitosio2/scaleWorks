import Link from "next/link";
import { modelTitle } from "@/lib/model-title";
import { Photo } from "@/components/ui/photo";
import type { GalleryItem } from "./queries";

// One card of the collection gallery: the cover photo and the title.
export function GalleryCard({ item }: { item: GalleryItem }) {
  const title = modelTitle(item.brand, item.name);
  return (
    <li>
      <Link href={`/collection/${item.id}`} className="group flex flex-col gap-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-line bg-canvas">
          {item.coverId && (
            <Photo
              src={`/img/collection/${item.coverId}/thumb`}
              alt={title}
              className="transition-transform group-hover:scale-[1.03]"
            />
          )}
        </div>
        <span title={title} className="truncate px-3 text-sm font-bold group-hover:text-brand">
          {title}
        </span>
      </Link>
    </li>
  );
}
