import type { modelPhase, paymentStatus } from "@/db/schema";

export type ModelPhase = (typeof modelPhase.enumValues)[number];

export type PaymentStatus = (typeof paymentStatus.enumValues)[number];

export const phaseLabels: Record<ModelPhase, string> = {
  not_started: "Not started",
  pending_decal_design: "Pending decal design",
  pending_painting: "Pending painting",
  pending_decals: "Pending decals",
  pending_varnish: "Pending varnish",
  pending_assembly: "Pending assembly",
  finished: "Finished",
};

export const quoteStatusLabels = {
  open: "Open",
  rejected: "Rejected",
} as const;

export const supplyStatusLabels = {
  to_order: "To order",
  ordered: "Ordered",
  in_hand: "In hand",
} as const;

export const paymentStatusLabels = {
  none: "No payment",
  deposit_paid: "Pending",
  paid: "Paid in full",
} as const;

// Remaining = price - deposit. Null when the price is unknown.
export function remainingCents(
  priceCents: number | null,
  depositCents: number | null,
) {
  return priceCents === null ? null : priceCents - (depositCents ?? 0);
}

// "12,50" or "12.5" -> 1250 (cents). Empty -> null. Invalid -> throws.
export function parseEuros(raw: string) {
  const value = raw.trim().replace(",", ".");
  if (!value) return null;
  const cents = Math.round(Number(value) * 100);
  if (!Number.isFinite(cents) || cents < 0) throw new Error("Invalid price");
  return cents;
}

// "1/4", "3/8", "0,3" or "2" -> number. Empty -> null. Invalid -> throws.
export function parseQuantity(raw: string) {
  const value = raw.trim().replace(",", ".");
  if (!value) return null;
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(value);
  const n = fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100) {
    throw new Error("Invalid quantity");
  }
  return n;
}

// 0.25 -> "1/4", 1.5 -> "1 1/2", 0.3 -> "0.3"
export function formatQuantity(n: number) {
  for (const d of [1, 2, 4, 8, 16, 32]) {
    const scaled = n * d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) {
      const whole = Math.floor(Math.round(scaled) / d);
      const num = Math.round(scaled) % d;
      if (num === 0) return String(whole);
      const frac = `${num}/${d}`;
      return whole > 0 ? `${whole} ${frac}` : frac;
    }
  }
  return String(Number(n.toFixed(3)));
}

// 90 -> "01:30"
export function formatDuration(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// "1:30" -> 90 (minutes 00-59). Returns null if the format is invalid.
export function parseDuration(value: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatEuros(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
