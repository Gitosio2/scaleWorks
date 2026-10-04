import {
  formatEuros,
  paymentStatusLabels,
  phaseLabels,
  remainingCents,
  type ModelPhase,
  type PaymentStatus,
} from "@/lib/labels";

export type BadgeVariant = "info" | "warn" | "ok" | "bad" | "mute";

const variants: Record<BadgeVariant, string> = {
  info: "bg-info-bg text-info",
  warn: "bg-warn-bg text-warn",
  ok: "bg-ok-bg text-ok",
  bad: "bg-bad-bg text-bad",
  mute: "bg-mute-bg text-mute",
};

export function StatusBadge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold ${variants[variant]}`}
    >
      <span aria-hidden className="size-[7px] rounded-full bg-current" />
      {children}
    </span>
  );
}

export function quoteStatusVariant(status: "open" | "rejected"): BadgeVariant {
  return status === "open" ? "info" : "bad";
}

export function supplyStatusVariant(
  status: "to_order" | "ordered" | "in_hand",
): BadgeVariant {
  return status === "to_order" ? "warn" : status === "ordered" ? "info" : "ok";
}

export function phaseVariant(phase: ModelPhase): BadgeVariant {
  if (phase === "not_started") return "mute";
  if (phase === "finished") return "ok";
  return "info";
}

export function PhaseBadge({ phase }: { phase: ModelPhase }) {
  return <StatusBadge variant={phaseVariant(phase)}>{phaseLabels[phase]}</StatusBadge>;
}

export function paymentVariant(status: PaymentStatus): BadgeVariant {
  return status === "paid" ? "ok" : status === "deposit_paid" ? "warn" : "mute";
}

// Badge plus, for a paid deposit, what is still owed.
export function PaymentBadge({
  status,
  priceCents,
  depositCents,
}: {
  status: PaymentStatus;
  priceCents: number | null;
  depositCents: number | null;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusBadge variant={paymentVariant(status)}>{paymentStatusLabels[status]}</StatusBadge>
      {status === "deposit_paid" && (
        <span className="text-[13px] text-ink-2">
          Remaining {formatEuros(remainingCents(priceCents, depositCents))}
        </span>
      )}
    </span>
  );
}
