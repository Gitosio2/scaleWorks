import { SITE_INITIAL, SITE_NAME } from "@/lib/site";

/** Logo mark and name shown at the top of the sidebar (app and public gallery). */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-accent font-display text-[20px] font-extrabold text-accent-fg"
      >
        {SITE_INITIAL}
      </span>
      <span className="font-display text-[24px] font-extrabold uppercase leading-none tracking-wide">
        <span className="sr-only">{SITE_NAME}</span>
        {/* Visual version: a slash stands in for the spaces between words. */}
        <span aria-hidden>
          {SITE_NAME.split(" ").map((word, i) => (
            <span key={i}>
              {i > 0 && <span className="text-muted">/</span>}
              {word}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
