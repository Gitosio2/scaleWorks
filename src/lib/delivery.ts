import type { supplyStatus } from "@/db/schema";

type SupplyStatus = (typeof supplyStatus.enumValues)[number];

export type DeliveryState = "empty" | "pending" | "partial" | "delivered";

// A delivery note has no state of its own: it follows its lines. Empty until it
// has lines, delivered once every line is in hand, partial while only some are.
export function deliveryState(statuses: ReadonlyArray<SupplyStatus>): DeliveryState {
  if (statuses.length === 0) return "empty";
  const inHand = statuses.filter((s) => s === "in_hand").length;
  if (inHand === 0) return "pending";
  return inHand === statuses.length ? "delivered" : "partial";
}

// A line added to a delivery that already arrived has arrived too.
export function newLineStatus(
  state: DeliveryState,
  requested: SupplyStatus,
): SupplyStatus {
  return state === "delivered" ? "in_hand" : requested;
}
