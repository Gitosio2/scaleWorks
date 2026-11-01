import { SITE_INITIAL, SITE_NAME } from "@/lib/site";

/** Logo mark and name shown at the top of the sidebar (app and public gallery). */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-[9px] bg-brand font-bold text-brand-fg"
      >
        {SITE_INITIAL}
      </span>
      <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
    </div>
  );
}
