import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageHref, type pageWindow } from "@/lib/pagination";
import type { SearchParams } from "@/lib/list-filters";
import { secondaryButtonClass } from "./styles";

// A link while `href` is set, a disabled look-alike when there is no such page.
function NavLink({ href, rel, label }: { href: string | null; rel: "prev" | "next"; label: string }) {
  if (href === null) {
    return (
      <span aria-disabled="true" className={`${secondaryButtonClass} pointer-events-none opacity-50`}>
        {label}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} className={secondaryButtonClass}>
      {label}
    </Link>
  );
}

/**
 * Previous / next links under a list. The links keep the list's other query
 * params (filters, sort); page 1 has no page param. Renders nothing when
 * everything fits on one page.
 */
export async function Pagination({
  pathname,
  searchParams,
  pageInfo,
  total,
}: {
  pathname: string;
  searchParams: SearchParams;
  pageInfo: ReturnType<typeof pageWindow>;
  total: number;
}) {
  const { page, totalPages, from, to } = pageInfo;
  if (totalPages <= 1) return null;
  const t = await getTranslations("common");

  return (
    <nav aria-label={t("pagination")} className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center justify-between gap-3 self-stretch">
        <NavLink
          href={page > 1 ? pageHref(pathname, searchParams, page - 1) : null}
          rel="prev"
          label={t("previous")}
        />
        <p className="text-[13px] font-semibold text-ink-2">{t("pageOf", { page, totalPages })}</p>
        <NavLink
          href={page < totalPages ? pageHref(pathname, searchParams, page + 1) : null}
          rel="next"
          label={t("next")}
        />
      </div>
      <p className="text-[13px] text-muted">{t("showing", { from, to, total })}</p>
    </nav>
  );
}
