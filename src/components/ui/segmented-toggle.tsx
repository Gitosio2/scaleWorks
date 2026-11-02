"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "./spinner";
import { variantSwatches, type BadgeVariant } from "./status-badge";

type Option = { value: string; label: string; variant: BadgeVariant };

// Thumb is 20px inset 3px inside a 1px border, with 22px between stops, so the
// track is 28px + 22px per extra stop wide. These are fixed class maps instead
// of inline styles: the CSP forbids style attributes, and Tailwind only emits
// classes it can find written out in full. Supports 2 to 5 stops.
const TRACK_WIDTH = { 2: "w-[50px]", 3: "w-[72px]", 4: "w-[94px]", 5: "w-[116px]" } as const;
const GRID_COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
} as const;
const THUMB_OFFSET = [
  "translate-x-0",
  "translate-x-[22px]",
  "translate-x-[44px]",
  "translate-x-[66px]",
  "translate-x-[88px]",
] as const;

/**
 * Multi-position switch: a light track with a thumb that slides between stops
 * and takes the color of the selected option. No visible text; labels are only
 * exposed to assistive tech. Clicking a stop saves it immediately.
 */
export function SegmentedToggle({
  value,
  options,
  action,
  label,
}: {
  value: string;
  options: Option[];
  action: (value: string) => Promise<void>;
  label: string;
}) {
  const t = useTranslations("common");
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const saved = useRef(value);

  function choose(next: string) {
    if (next === saved.current) return;
    const previous = saved.current;
    saved.current = next;
    setSelected(next);
    setError(false);
    startTransition(async () => {
      try {
        await action(next);
      } catch {
        saved.current = previous;
        setSelected(previous);
        setError(true);
      }
    });
  }

  const index = Math.max(0, options.findIndex((o) => o.value === selected));
  const stops = options.length as keyof typeof TRACK_WIDTH;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label={label}
          aria-busy={pending}
          className={`relative h-7 shrink-0 rounded-full border border-input-border bg-line ${TRACK_WIDTH[stops]}`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute top-[3px] left-[3px] size-5 rounded-full shadow transition-all duration-150 ${THUMB_OFFSET[index]} ${variantSwatches[options[index].variant].solid}`}
          />
          <div className={`absolute inset-0 grid ${GRID_COLUMNS[stops]}`}>
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={i === index}
                aria-label={o.label}
                onClick={() => choose(o.value)}
                className="flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {i !== index && <span aria-hidden className="size-1.5 rounded-full bg-muted/40" />}
              </button>
            ))}
          </div>
        </div>
        {pending && <Spinner className="size-4 text-muted" />}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t("saveFailed")}
        </p>
      )}
    </div>
  );
}
