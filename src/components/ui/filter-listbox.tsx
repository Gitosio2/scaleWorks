"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listboxOptions,
  moveIndex,
  TYPEAHEAD_RESET_MS,
  typeaheadIndex,
  typeaheadQuery,
  type ListboxKey,
} from "@/lib/listbox";
import { cx, inputClass, labelClass } from "./styles";

export type FilterListboxOption = {
  value: string;
  label: string;
  // Decorative node drawn before the label (e.g. a flag), rendered by the server so its markup is not bundled here.
  icon?: React.ReactNode;
};

const NAVIGATION_KEYS: readonly string[] = ["ArrowDown", "ArrowUp", "Home", "End"];

// Native setter of <input>.value: unlike `input.value = x` it does not tell React's
// value tracker, so the `input` event dispatched afterwards is reported as a change.
const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

/**
 * A single-choice filter shown as a button that opens a listbox, for the cases where
 * an option needs more than text (a native <option> cannot hold an icon). Drop-in for
 * `FilterSelect` inside `ListFilters`: it submits the same `name` param through a
 * hidden input and announces a selection with a bubbling `input` event, so the form
 * auto-submits and picks up back/forward URL changes just as it does for a select.
 */
export function FilterListbox({
  name,
  label,
  defaultValue,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: ReadonlyArray<FilterListboxOption>;
  // Label of the empty option (default: "All"); pass null when a value must always be chosen.
  allLabel?: string | null;
}) {
  const t = useTranslations("common");
  const uid = useId();
  const labelId = `${uid}-label`;
  const buttonId = `${uid}-button`;
  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ query: "", at: 0 });

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // The value follows the URL (`defaultValue`, new on back/forward/reset) unless the
  // user has already picked something newer that the server has not caught up with.
  const [sel, setSel] = useState({ value: defaultValue, seen: defaultValue });
  let value = sel.value;
  if (sel.seen !== defaultValue) {
    value = sel.value === sel.seen || sel.value === defaultValue ? defaultValue : sel.value;
    setSel({ value, seen: defaultValue });
  }

  useEffect(() => {
    const input = hiddenRef.current;
    if (input && input.value !== value) input.value = value;
  }, [value]);

  const shown: ReadonlyArray<FilterListboxOption> = listboxOptions(
    options,
    allLabel === undefined ? t("all") : allLabel,
    defaultValue,
  );
  const selected: FilterListboxOption = shown.find((o) => o.value === value) ?? { value, label: value };
  const selectedIndex = shown.findIndex((o) => o.value === value);

  // Focus moves into the listbox while it is open, and the active option is kept in view.
  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, uid]);

  // A press outside closes it (a tap on a non-focusable area does not blur on every touch browser).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openList() {
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function choose(next: string) {
    close(true);
    if (next === value) return;
    setSel((s) => ({ ...s, value: next }));
    const input = hiddenRef.current;
    if (input && setNativeValue) {
      setNativeValue.call(input, next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    // Enter and Space already click the button, which opens the list.
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList();
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    const { key } = e;
    if (NAVIGATION_KEYS.includes(key)) {
      e.preventDefault();
      setActive(moveIndex(active, shown.length, key as ListboxKey));
      return;
    }
    if (key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (key === "Tab") {
      // Hand focus back to the button first so Tab continues from there.
      close(true);
      return;
    }
    const now = e.timeStamp;
    const typing = typed.current.query !== "" && now - typed.current.at <= TYPEAHEAD_RESET_MS;
    if (key === "Enter" || (key === " " && !typing)) {
      e.preventDefault();
      if (shown[active]) choose(shown[active].value);
      return;
    }
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const query = typeaheadQuery(typed.current.query, typed.current.at, key, now);
      typed.current = { query, at: now };
      const index = typeaheadIndex(shown.map((o) => o.label), active, query);
      if (index >= 0) setActive(index);
    }
  }

  return (
    <div className={labelClass}>
      <label id={labelId} htmlFor={buttonId}>
        {label}
      </label>
      <div
        ref={wrapperRef}
        data-listbox-open={open ? "" : undefined}
        className="relative grid"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <input
          ref={hiddenRef}
          type="text"
          hidden
          readOnly
          tabIndex={-1}
          autoComplete="off"
          name={name}
          defaultValue={defaultValue}
        />
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${labelId} ${buttonId}`}
          onClick={() => (open ? close(true) : openList())}
          onKeyDown={onTriggerKeyDown}
          // Keep focus in the listbox when the button closes it, so the blur does not close it first.
          onMouseDown={(e) => open && e.preventDefault()}
          className={cx(inputClass, "group flex w-full cursor-pointer items-center gap-2 text-left font-normal")}
        >
          {selected.icon ? (
            <span aria-hidden className="flex shrink-0 items-center">
              {selected.icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4 shrink-0 text-muted transition-transform group-aria-expanded:rotate-180"
          >
            <path d="M5.5 7.5 10 12l4.5-4.5z" />
          </svg>
        </button>
        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={optionId(active)}
            onKeyDown={onListKeyDown}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-[10px] border border-input-border bg-surface py-1 text-ink shadow-lg outline-none"
          >
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                onClick={() => choose(o.value)}
                onMouseMove={() => setActive(i)}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm",
                  i === active && "bg-canvas",
                  o.value === value && "font-semibold text-brand",
                )}
              >
                {o.icon ? (
                  <span aria-hidden className="flex shrink-0 items-center">
                    {o.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
