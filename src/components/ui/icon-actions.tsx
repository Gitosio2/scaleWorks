import Link from "next/link";
import { cx } from "./styles";

const baseClass =
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] hover:bg-canvas";

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-5",
} as const;

function PencilIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// `label` is the accessible name (aria-label) and the hover tooltip (title).

export function EditIconLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={cx(baseClass, "text-brand")}>
      <PencilIcon />
    </Link>
  );
}

export function DeleteIconButton({ label }: { label: string }) {
  return (
    <button type="submit" aria-label={label} title={label} className={cx(baseClass, "text-danger")}>
      <TrashIcon />
    </button>
  );
}

export function ConfirmIconButton({ label }: { label: string }) {
  return (
    <button type="submit" aria-label={label} title={label} className={cx(baseClass, "text-brand")}>
      <CheckIcon />
    </button>
  );
}
