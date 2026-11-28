"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "./spinner";
import { cx, secondaryButtonClass } from "./styles";

export type LoadMoreBatch = { items: React.ReactNode; count: number };

/**
 * List whose "Show more" button fetches only the next batch of rows and appends
 * it, keeping the rows already on screen. `children` is the first batch (the
 * <li>s rendered by the page) and `loadMore(offset, limit?)` returns the next
 * rows rendered on the server (`limit` defaults to one batch).
 *
 * Key it by what selects the rows (locale and filters), so other filters or
 * another language start over. When the page's data changes in place (an item
 * added, edited or deleted), a new `refreshKey` re-fetches every appended row in
 * one call; the rows on screen stay until the fresh ones arrive.
 */
export function LoadMoreList({
  children,
  initialCount,
  total,
  refreshKey,
  listClassName,
  listWrapperClassName,
  loadMore,
}: {
  children: React.ReactNode;
  initialCount: number;
  total: number;
  refreshKey?: string;
  listClassName?: string;
  // When set, the list sits in a <section> with these classes (e.g. a card)
  // and the button stays outside it.
  listWrapperClassName?: string;
  loadMore: (offset: number, limit?: number) => Promise<LoadMoreBatch>;
}) {
  const t = useTranslations("common");
  const [batches, setBatches] = useState<React.ReactNode[]>([]);
  const [appendedCount, setAppendedCount] = useState(0);
  // A load that came back empty: the list shrank since the page was rendered.
  const [exhausted, setExhausted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // State updates land after a render, so a fast second click is stopped here.
  const busy = useRef(false);
  // Each request takes a number; only the latest one may change the list.
  const latest = useRef(0);
  const lastRefreshKey = useRef(refreshKey);
  const focusStatus = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  const shown = initialCount + appendedCount;
  const hasMore = shown < total && !exhausted;

  async function handleLoadMore() {
    if (busy.current) return;
    busy.current = true;
    const request = ++latest.current;
    setPending(true);
    setFailed(false);
    try {
      const { items, count } = await loadMore(shown);
      if (request !== latest.current) return;
      // The button goes away with the last batch: keep the focus on the page.
      focusStatus.current = document.activeElement === buttonRef.current && (count === 0 || shown + count >= total);
      setBatches((current) => [...current, items]);
      setAppendedCount((current) => current + count);
      if (count === 0) setExhausted(true);
    } catch {
      if (request === latest.current) setFailed(true);
    } finally {
      if (request === latest.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }

  // The page re-rendered with changed data: fetch the appended range again.
  useEffect(() => {
    if (lastRefreshKey.current === refreshKey) return;
    lastRefreshKey.current = refreshKey;
    if (appendedCount === 0) return;

    busy.current = true;
    const request = ++latest.current;
    loadMore(initialCount, appendedCount)
      .then(
        ({ items, count }) => {
          if (request !== latest.current) return;
          setBatches([items]);
          setAppendedCount(count);
          setExhausted(false);
          setFailed(false);
        },
        () => {
          if (request !== latest.current) return;
          // Better the first batch alone than rows that may be out of date.
          setBatches([]);
          setAppendedCount(0);
          setExhausted(false);
        },
      )
      .finally(() => {
        if (request !== latest.current) return;
        busy.current = false;
        setPending(false);
      });
  }, [refreshKey, initialCount, appendedCount, loadMore]);

  useEffect(() => {
    if (hasMore || !focusStatus.current) return;
    focusStatus.current = false;
    statusRef.current?.focus();
  }, [hasMore]);

  const list = (
    <ul className={listClassName}>
      {children}
      {batches.map((items, index) => (
        <Fragment key={index}>{items}</Fragment>
      ))}
    </ul>
  );

  return (
    <>
      {listWrapperClassName ? <section className={listWrapperClassName}>{list}</section> : list}

      {initialCount < total && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {hasMore && (
            // aria-disabled rather than disabled, so the keyboard focus stays on it while loading.
            <button
              ref={buttonRef}
              type="button"
              onClick={handleLoadMore}
              aria-disabled={pending}
              aria-busy={pending}
              className={cx(secondaryButtonClass, "gap-2", pending && "cursor-wait")}
            >
              {pending && <Spinner />}
              {t("showMore")}
            </button>
          )}
          <div aria-live="polite" className="flex flex-col items-center gap-1 text-center text-[13px]">
            <p ref={statusRef} tabIndex={-1} className="text-muted">
              {t("showingCount", { shown: Math.min(shown, total), total })}
            </p>
            {failed && <p className="text-danger">{t("loadMoreError")}</p>}
          </div>
        </div>
      )}
    </>
  );
}
