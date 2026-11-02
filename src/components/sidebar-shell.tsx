"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The sidebar of the app and of the public gallery. From the md breakpoint it is
 * the fixed side column, with `brand` and `children` laid out directly in it. On
 * a phone only the brand bar is shown, with a hamburger button that drops the
 * rest of the menu down over the page.
 */
export function SidebarShell({
  brand,
  children,
}: {
  brand: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // The page the menu was opened on, or null while it is closed. Going to another
  // page (a link, back, forward) closes it: the stored path is dropped right away,
  // not just ignored, so coming back to the same page does not reopen it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const open = openOn !== null;

  return (
    <aside
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpenOn(null);
      }}
      className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-line bg-sidebar p-4 md:h-dvh md:w-[232px] md:gap-6 md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:py-6"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          className="-my-1 -ml-2 flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-ink hover:bg-line md:hidden"
        >
          <svg
            aria-hidden
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        {brand}
      </div>
      {/* A dropdown below the bar on a phone; from md on `contents` makes the items part of the sidebar itself. */}
      <div
        id="site-menu"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpenOn(null);
        }}
        className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] flex-col gap-6 overflow-y-auto border-b border-line bg-sidebar p-4 shadow-lg md:contents`}
      >
        {children}
      </div>
    </aside>
  );
}
