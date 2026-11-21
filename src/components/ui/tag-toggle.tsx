import { cx } from "./styles";

/**
 * A tag as a toggle chip: a visually hidden checkbox inside a rounded label that
 * turns green, with a check mark, while checked. Shared by the item form and the
 * collection filters so a selected tag looks the same in both. The checkbox is
 * uncontrolled or controlled as the caller likes (`defaultChecked` or `checked` +
 * `onChange`); the checked look comes from CSS, not from React state.
 */
export function TagToggle({
  label,
  ...input
}: { label: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "children">) {
  return (
    <label
      className={cx(
        "group inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-input-border bg-input px-3 text-[13px] font-semibold text-ink-2",
        "has-[:checked]:border-ok has-[:checked]:bg-ok has-[:checked]:text-brand-fg",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ok",
      )}
    >
      <input type="checkbox" {...input} className="sr-only" />
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="hidden group-has-[:checked]:block"
      >
        <path d="m5 12 5 5 9-10" />
      </svg>
      {label}
    </label>
  );
}
