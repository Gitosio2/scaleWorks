"use client";

import Form from "next/form";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { RESET_PARAM } from "@/lib/filter-reset";
import { inputClass, labelClass, secondaryButtonClass } from "./styles";

const TYPING_DEBOUNCE_MS = 400;

// Fields are uncontrolled. When the URL changes without the user typing (back,
// forward, reset), the server passes a new defaultValue; copy it into the field
// unless the user is editing it right now.
function useSyncedField<T extends HTMLInputElement | HTMLSelectElement>(
  defaultValue: string,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.value !== defaultValue) {
      el.value = defaultValue;
    }
  }, [defaultValue]);
  return ref;
}

/**
 * Collapsible (closed by default) filter panel. It is a GET form, so the
 * filters live in the URL and the list page filters on the server. The form is
 * submitted as soon as a field changes; text fields wait until typing pauses.
 */
export function ListFilters({
  action,
  activeCount,
  children,
}: {
  action: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    clearTimeout(typingTimer.current);
    if (e.target instanceof HTMLInputElement) {
      typingTimer.current = setTimeout(() => form.requestSubmit(), TYPING_DEBOUNCE_MS);
    } else {
      form.requestSubmit();
    }
  }

  return (
    <details className="group overflow-hidden rounded-[14px] border border-l-4 border-brand/25 border-l-brand bg-brand/5">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-5 bg-brand text-sm font-bold text-brand-fg hover:bg-brand-hover [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2.5">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <path d="M3 4h14l-5.5 6.5V16l-3 1.5v-7L3 4z" />
          </svg>
          {t("filters")}
          {activeCount > 0 && (
            <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-brand-fg px-1.5 text-xs font-semibold text-brand">
              {activeCount}
            </span>
          )}
        </span>
        <span aria-hidden className="transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <Form
        action={action}
        replace
        onChange={handleChange}
        className="flex flex-col gap-3 border-t border-brand/20 p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          {/* A plain link, not a script: the page is loaded afresh, so the fields and the list always come back at their initial state. */}
          <a href={`${action}?${RESET_PARAM}=1`} className={secondaryButtonClass}>
            {t("reset")}
          </a>
        </div>
      </Form>
    </details>
  );
}

export function FilterText({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  const ref = useSyncedField<HTMLInputElement>(defaultValue);
  return (
    <label className={labelClass}>
      {label}
      <input
        ref={ref}
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

export function FilterSelect({
  name,
  label,
  defaultValue,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  // Label of the empty option (default: "All"); pass null when a value must always be chosen.
  allLabel?: string | null;
}) {
  const t = useTranslations("common");
  const ref = useSyncedField<HTMLSelectElement>(defaultValue);
  // A bookmarked value that is no longer offered must still show as selected.
  const shown =
    defaultValue && !options.some((o) => o.value === defaultValue)
      ? [...options, { value: defaultValue, label: defaultValue }]
      : options;
  return (
    <label className={labelClass}>
      {label}
      <select ref={ref} name={name} defaultValue={defaultValue} className={inputClass}>
        {allLabel !== null && <option value="">{allLabel ?? t("all")}</option>}
        {shown.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
