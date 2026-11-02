"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Photo } from "@/components/ui/photo";

export type ViewerPhoto = { id: string; alt: string; caption?: string };

const SWIPE_DISTANCE = 50;

const arrowClass =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20";

/**
 * A grid of photos that opens full screen in a viewer on click, where the
 * visitor can move between them with the arrows, the keyboard or a swipe. It
 * is built on a native modal <dialog>, which already traps focus and closes on
 * Escape. No inline styles anywhere: the CSP forbids them.
 */
export function PhotoViewer({
  photos,
  className = "",
  gridSize = "full",
}: {
  photos: ViewerPhoto[];
  className?: string;
  /** Size of the grid pictures; the viewer always loads the full one. */
  gridSize?: "thumb" | "full";
}) {
  const t = useTranslations("portfolio.viewer");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const count = photos.length;
  const step = (delta: number) =>
    setIndex((i) => (i === null ? i : (i + delta + count) % count));
  const current = index === null ? null : photos[index];

  return (
    <>
      <ul className={className}>
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-[14px] border border-line bg-canvas"
            >
              <Photo src={`/img/${photo.id}/${gridSize}`} alt={photo.alt} />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={t("label")}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") step(-1);
          if (e.key === "ArrowRight") step(1);
        }}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 text-white select-none backdrop:bg-black/90"
      >
        {current && (
          <div
            className="flex h-full flex-col gap-3 p-3 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIndex(null);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="min-w-0 truncate text-sm text-white/80" aria-live="polite">
                {t("counter", { n: (index ?? 0) + 1, total: count })}
                {current.caption && ` · ${current.caption}`}
              </span>
              <button
                type="button"
                onClick={() => setIndex(null)}
                aria-label={t("close")}
                className={arrowClass}
              >
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center sm:px-14"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIndex(null);
              }}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const delta = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(delta) >= SWIPE_DISTANCE) step(delta > 0 ? -1 : 1);
              }}
            >
              {count > 1 && (
                <button type="button" onClick={() => step(-1)} aria-label={t("previous")} className={`${arrowClass} absolute top-1/2 left-0 -translate-y-1/2 max-sm:hidden`}>
                  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
              )}
              <img
                src={`/img/${current.id}/full`}
                alt={current.alt}
                draggable={false}
                className="max-h-full min-w-0 max-w-full rounded-[10px] object-contain"
              />
              {count > 1 && (
                <button type="button" onClick={() => step(1)} aria-label={t("next")} className={`${arrowClass} absolute top-1/2 right-0 -translate-y-1/2 max-sm:hidden`}>
                  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            {count > 1 && (
              <div className="flex justify-center gap-6 sm:hidden">
                <button type="button" onClick={() => step(-1)} aria-label={t("previous")} className={arrowClass}>
                  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <button type="button" onClick={() => step(1)} aria-label={t("next")} className={arrowClass}>
                  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
