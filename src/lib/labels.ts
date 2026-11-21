import type { modelPhase, paymentStatus } from "@/db/schema";
import { intlLocales, type Locale } from "@/i18n/config";
import type messages from "../../messages/en.json";

export type ModelPhase = (typeof modelPhase.enumValues)[number];

export type PaymentStatus = (typeof paymentStatus.enumValues)[number];

// Translator for the `actionErrors` namespace, so validation helpers can throw
// messages in the active locale (e.g. `await getTranslations("actionErrors")`).
export type ActionT = (key: keyof (typeof messages)["actionErrors"]) => string;

// Remaining = price - deposit. Null when the price is unknown.
export function remainingCents(
  priceCents: number | null,
  depositCents: number | null,
) {
  return priceCents === null ? null : priceCents - (depositCents ?? 0);
}

const MAX_INT4 = 2_147_483_647;
// Plain amount ("12", "12.5", "12,50") or Spanish thousands ("1.234", "1.234,56").
const PLAIN_AMOUNT = /^(\d+)(?:[.,](\d{1,2}))?$/;
const THOUSANDS_AMOUNT = /^([1-9]\d{0,2}(?:\.\d{3})*)(?:,(\d{1,2}))?$/;

// "12,50" or "12.5" -> 1250 (cents). "1.234,56" and "1.250" read dots as thousands
// separators. Empty -> null. More than two decimals, an ambiguous "1,234", a
// negative or anything above the integer column limit -> throws.
export function parseEuros(raw: string, t: ActionT) {
  const value = raw.trim();
  if (!value) return null;
  const match = PLAIN_AMOUNT.exec(value) ?? THOUSANDS_AMOUNT.exec(value);
  if (!match) throw new Error(t("invalidPrice"));
  const euros = Number(match[1].replace(/\./g, ""));
  const cents = euros * 100 + Number((match[2] ?? "").padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents) || cents > MAX_INT4) throw new Error(t("invalidPrice"));
  return cents;
}

// "1/4", "3/8", "0,3" or "2" -> number. Empty -> null. Invalid -> throws.
export function parseQuantity(raw: string, t: ActionT) {
  const value = raw.trim().replace(",", ".");
  if (!value) return null;
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(value);
  const n = fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100) {
    throw new Error(t("invalidQuantity"));
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

export function formatEuros(cents: number | null, locale: Locale) {
  if (cents === null) return "—";
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

// 0.256 -> "26%" / "26 %": a share between 0 and 1 as a whole percent.
export function formatPercent(share: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(share);
}

// "2026-03-05" (a calendar date, no time zone) -> "Mar 5, 2026" / "5 mar 2026".
export function formatDate(date: string | null, locale: Locale) {
  if (date === null) return "—";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsed);
}
