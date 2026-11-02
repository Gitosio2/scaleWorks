"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { adjustQuantity } from "@/lib/stock";
import { cx } from "@/components/ui/styles";

const buttonClass =
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-input-border bg-surface text-lg font-semibold text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Quick -/+ control for a stock count. The count updates right away and rolls
 * back if the server rejects the change. The minus button stops at zero.
 */
export function QuantityStepper({
  quantity,
  action,
}: {
  quantity: number;
  action: (delta: number) => Promise<void>;
}) {
  const t = useTranslations("components");
  const tc = useTranslations("common");
  const [value, setValue] = useState(quantity);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [seen, setSeen] = useState(quantity);

  // Server data changed (edit modal, another tab): follow it.
  if (seen !== quantity && !pending) {
    setSeen(quantity);
    setValue(quantity);
  }

  function step(delta: number) {
    const previous = value;
    setValue(adjustQuantity(previous, delta));
    setError(false);
    startTransition(async () => {
      try {
        await action(delta);
      } catch {
        setValue(previous);
        setError(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value === 0}
          aria-label={t("decrease")}
          title={t("decrease")}
          className={buttonClass}
        >
          −
        </button>
        <span
          aria-live="polite"
          className={cx("min-w-8 text-center font-bold tabular-nums", value === 0 && "text-muted")}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={t("increase")}
          title={t("increase")}
          className={buttonClass}
        >
          +
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {tc("saveFailed")}
        </p>
      )}
    </div>
  );
}
