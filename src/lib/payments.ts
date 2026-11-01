import type { ActionT, PaymentStatus } from "@/lib/labels";

type PaymentInput = {
  status: PaymentStatus;
  depositCents: number | null;
  priceCents: number | null;
};

type PaymentResult = {
  status: PaymentStatus;
  depositCents: number | null;
};

// Derives the stored payment state from the submitted values.
// A deposit > 0 always wins over the selected status:
//   deposit == price -> paid (deposit cleared)
//   deposit <  price (or unknown price) -> deposit_paid ("Pending")
//   deposit >  price -> error
// Without a deposit, "deposit_paid" is invalid; "none"/"paid" keep no deposit.
export function derivePayment(
  { status, depositCents, priceCents }: PaymentInput,
  t: ActionT,
): PaymentResult {
  if (depositCents !== null && depositCents < 0) {
    throw new Error(t("depositNotPositive"));
  }
  if (depositCents !== null && depositCents > 0) {
    if (priceCents !== null && depositCents > priceCents) {
      throw new Error(t("depositExceedsPrice"));
    }
    if (priceCents !== null && depositCents === priceCents) {
      return { status: "paid", depositCents: null };
    }
    return { status: "deposit_paid", depositCents };
  }
  if (status === "deposit_paid") {
    throw new Error(t("depositRequired"));
  }
  return { status, depositCents: null };
}
