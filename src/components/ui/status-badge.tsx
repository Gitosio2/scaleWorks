import { useLocale, useTranslations } from "next-intl";
import {
  formatEuros,
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

// Solid fill when selected, soft tint otherwise; used by compact toggles.
export const variantSwatches: Record<BadgeVariant, { solid: string; tint: string }> = {
  info: { solid: "bg-info", tint: "bg-info-bg" },
  warn: { solid: "bg-warn", tint: "bg-warn-bg" },
  ok: { solid: "bg-ok", tint: "bg-ok-bg" },
  bad: { solid: "bg-bad", tint: "bg-bad-bg" },
  mute: { solid: "bg-mute", tint: "bg-mute-bg" },
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

export function quoteStatusVariant(status: "draft" | "open" | "rejected"): BadgeVariant {
  if (status === "draft") return "warn";
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
  const t = useTranslations("phase");
  return <StatusBadge variant={phaseVariant(phase)}>{t(phase)}</StatusBadge>;
}

// Shown next to the phase when the owner paused the model because it is unpaid.
export function HoldBadge() {
  const t = useTranslations("paymentHold");
  return <StatusBadge variant="bad">{t("badge")}</StatusBadge>;
}

export function paymentVariant(status: PaymentStatus): BadgeVariant {
  return status === "paid" ? "ok" : status === "deposit_paid" ? "warn" : "mute";
}

// Badge; for a paid deposit it also shows what is still owed (when the price is known).
export function PaymentBadge({
  status,
  priceCents,
  depositCents,
}: {
  status: PaymentStatus;
  priceCents: number | null;
  depositCents: number | null;
}) {
  const t = useTranslations("paymentStatus");
  const locale = useLocale();
  const owed = status === "deposit_paid" ? remainingCents(priceCents, depositCents) : null;
  return (
    <StatusBadge variant={paymentVariant(status)}>
      {owed === null ? t(status) : t("pendingAmount", { amount: formatEuros(owed, locale) })}
    </StatusBadge>
  );
}
