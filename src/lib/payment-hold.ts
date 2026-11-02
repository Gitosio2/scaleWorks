import type { PaymentStatus } from "@/lib/labels";

// A model can be put on hold by hand when the client has not paid. It is never
// automatic. Only models with something still owed can be held.
export function canHold(status: PaymentStatus) {
  return status !== "paid";
}

/**
 * The stored hold date after a change: the original date is kept while the hold
 * stays on, and a model paid in full never keeps one.
 */
export function nextHold({
  current,
  requested,
  status,
  now,
}: {
  current: Date | null;
  requested: boolean;
  status: PaymentStatus;
  now: Date;
}) {
  if (!requested || !canHold(status)) return null;
  return current ?? now;
}
