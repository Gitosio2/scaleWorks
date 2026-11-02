"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";
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

function BanknoteIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v.01M18 14.5v.01" />
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

/**
 * Icon button that submits its form. While the form's action runs it is disabled
 * and the icon gives way to a spinner. It reads the status of the form it sits in.
 */
function IconSubmit({
  label,
  className,
  pressed,
  children,
}: {
  label: string;
  className: string;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cx(baseClass, className, pending && "cursor-wait")}
    >
      {pending ? <Spinner className="size-5" /> : children}
    </button>
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

// Non-submit variant of the pencil, for triggers that open a modal.
export function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={label}
      title={label}
      className={cx(baseClass, "text-brand")}
    >
      <PencilIcon />
    </button>
  );
}

export function DeleteIconButton({ label }: { label: string }) {
  return (
    <IconSubmit label={label} className="text-danger">
      <TrashIcon />
    </IconSubmit>
  );
}

// Non-submit variant of the trash, for triggers that open a confirmation. When
// `blocked` is set it stays visible but inert, and the reason is the tooltip.
export function TrashIconButton({
  label,
  onClick,
  blocked,
}: {
  label: string;
  onClick: () => void;
  blocked?: string;
}) {
  const text = blocked ?? label;
  return (
    <button
      type="button"
      onClick={blocked ? undefined : onClick}
      aria-haspopup={blocked ? undefined : "dialog"}
      aria-disabled={blocked ? true : undefined}
      aria-label={text}
      title={text}
      className={cx(
        baseClass,
        "text-danger",
        blocked && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      <TrashIcon />
    </button>
  );
}

// Banknote: create a quote from the current item. `label` keeps the full action text.
export function QuoteIconButton({ label }: { label: string }) {
  return (
    <IconSubmit label={label} className="text-brand">
      <BanknoteIcon />
    </IconSubmit>
  );
}

/**
 * Round check that toggles "paid": an empty circle when unpaid, a filled green
 * one when paid. `label` says what pressing it does (mark as paid / not paid).
 */
export function PaidCheckButton({ paid, label }: { paid: boolean; label: string }) {
  return (
    <IconSubmit label={label} pressed={paid} className={paid ? "text-ok" : "text-muted hover:text-ok"}>
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" fill={paid ? "currentColor" : "none"} fillOpacity={paid ? 0.15 : 0} />
        <path d="m8 12.5 2.8 2.8L16.5 9.5" />
      </svg>
    </IconSubmit>
  );
}

/**
 * Pause icon that toggles the "on hold, unpaid" flag: filled when on hold.
 * `label` says what pressing it does (put on hold / resume).
 */
export function HoldIconButton({ held, label }: { held: boolean; label: string }) {
  return (
    <IconSubmit label={label} pressed={held} className={held ? "text-bad" : "text-muted hover:text-bad"}>
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" fill={held ? "currentColor" : "none"} fillOpacity={held ? 0.15 : 0} />
        <path d="M10 9v6M14 9v6" />
      </svg>
    </IconSubmit>
  );
}

export function ConfirmIconButton({ label }: { label: string }) {
  return (
    <IconSubmit label={label} className="text-brand">
      <CheckIcon />
    </IconSubmit>
  );
}
