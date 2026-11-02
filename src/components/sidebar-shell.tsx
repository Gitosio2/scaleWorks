"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The sidebar of the app and of the public gallery. From the md breakpoint it is
 * the fixed side column, with `brand` and `children` laid out directly in it. On
 * a phone only the brand bar is shown, with a hamburger button that drops the
 * rest of the menu down over the page.
 *
 * When the column is taller than the screen it scrolls without a scrollbar: the
 * edge that has more content past it fades out instead. The scroll lives in an
 * inner box so the mask does not fade the column's own border.
 */
export function SidebarShell({
  brand,
  children,
  wide = false,
}: {
  brand: React.ReactNode;
  children: React.ReactNode;
  /** A wider side column, for a menu with long entries. */
  wide?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // The page the menu was opened on, or null while it is closed. Going to another
  // page (a link, back, forward) closes it: the stored path is dropped right away,
  // not just ignored, so coming back to the same page does not reopen it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const open = openOn !== null;

  // Which edges of the side column have more content past them (md and up).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ top: false, bottom: false });
  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
  }, []);
  // The resize observer reports once when it starts, then whenever the box or its
  // direct children change size. The menu wrapper has no box of its own
  // (`contents`), so a group that expands inside it is only seen by watching the
  // subtree for the attributes and nodes that change its height.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const resize = new ResizeObserver(updateFade);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    const mutation = new MutationObserver(updateFade);
    mutation.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "open"],
    });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [pathname, updateFade]);

  return (
    <aside
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpenOn(null);
      }}
      className={`sticky top-0 z-30 flex shrink-0 flex-col border-b border-line bg-sidebar p-4 md:h-dvh ${wide ? "md:w-[272px]" : "md:w-[232px]"} md:self-start md:border-r md:border-b-0 md:py-0`}
    >
      {/* A plain box on a phone (`contents`); from md on it is the scrolling area of the column. */}
      <div
        ref={scrollRef}
        onScroll={updateFade}
        className={`contents md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-6 md:overflow-y-auto md:py-6 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden md:[-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_var(--fade-top),#000_calc(100%-var(--fade-bottom)),transparent)] md:[mask-image:linear-gradient(to_bottom,transparent,#000_var(--fade-top),#000_calc(100%-var(--fade-bottom)),transparent)] ${fade.top ? "md:[--fade-top:36px]" : "md:[--fade-top:0px]"} ${fade.bottom ? "md:[--fade-bottom:36px]" : "md:[--fade-bottom:0px]"}`}
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
      </div>
    </aside>
  );
}
