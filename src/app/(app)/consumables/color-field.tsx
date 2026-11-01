"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ralHex } from "@/lib/ral";
import { cx, labelClass } from "@/components/ui/styles";

const NEUTRAL = "#9a968e";

/**
 * Color for paints. A RAL code typed in the sibling "reference" field is
 * detected automatically; the picker is for colors that have no RAL code and
 * overrides the detected one. Only a manual pick is stored: the RAL swatch is
 * derived, so it never goes stale. Sibling fields are read through the form's
 * events so this works inside both create and edit modals.
 */
export function ColorField({
  defaultColor,
  defaultReference,
  defaultCategory,
}: {
  defaultColor?: string | null;
  defaultReference?: string | null;
  defaultCategory: string;
}) {
  const t = useTranslations("consumables");
  const tc = useTranslations("common");
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [manual, setManual] = useState<string | null>(defaultColor ?? null);
  const [reference, setReference] = useState(defaultReference ?? "");
  const [category, setCategory] = useState(defaultCategory);

  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const sync = () => {
      const ref = form.elements.namedItem("reference") as HTMLInputElement | null;
      const cat = form.elements.namedItem("category") as HTMLSelectElement | null;
      if (ref) setReference(ref.value);
      if (cat) setCategory(cat.value);
    };
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }, []);

  const isPaint = category === "paint";
  const detected = ralHex(reference);
  const shown = manual ?? detected ?? NEUTRAL;
  const hint = manual ? null : detected ? t("colorFromRal") : t("colorHint");

  return (
    <div ref={wrapRef} className={cx(labelClass, !isPaint && "hidden")}>
      <label htmlFor={id}>{tc("color")}</label>
      {/* Submitted only for paints, so changing category drops a stale color. */}
      <input type="hidden" name="color" value={isPaint ? (manual ?? "") : ""} />
      <div className="flex flex-wrap items-center gap-3 font-normal">
        <input
          id={id}
          type="color"
          value={shown}
          onChange={(e) => setManual(e.target.value)}
          className="size-11 cursor-pointer rounded-[10px] border border-input-border bg-input p-1"
        />
        {manual && (
          <button
            type="button"
            onClick={() => setManual(null)}
            className="min-h-11 cursor-pointer px-1 text-sm font-semibold text-brand hover:text-brand-hover"
          >
            {t("colorClear")}
          </button>
        )}
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </div>
    </div>
  );
}
