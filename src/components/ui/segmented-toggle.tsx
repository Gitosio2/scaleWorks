"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { variantSwatches, type BadgeVariant } from "./status-badge";

type Option = { value: string; label: string; variant: BadgeVariant };

// Track is w-[4.5rem] (72px) with a 1px border, thumb is 20px inset 3px: 22px between stops.
const THUMB_STEP_PX = 22;

/**
 * Three-position switch: a light track with a thumb that slides between stops
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

  return (
    <div className="flex flex-col gap-1">
      <div
        role="radiogroup"
        aria-label={label}
        aria-busy={pending}
        className="relative h-7 w-[4.5rem] rounded-full border border-input-border bg-line"
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-[3px] left-[3px] size-5 rounded-full shadow transition-all duration-150 ${variantSwatches[options[index].variant].solid}`}
          style={{ transform: `translateX(${index * THUMB_STEP_PX}px)` }}
        />
        <div className="absolute inset-0 grid grid-cols-3">
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
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t("saveFailed")}
        </p>
      )}
    </div>
  );
}
