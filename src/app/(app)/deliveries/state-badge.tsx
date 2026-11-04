import { useTranslations } from "next-intl";
import type { DeliveryState } from "@/lib/delivery";
import { StatusBadge, type BadgeVariant } from "@/components/ui/status-badge";

const variant: Record<DeliveryState, BadgeVariant> = {
  empty: "mute",
  pending: "warn",
  partial: "info",
  delivered: "ok",
};

export function DeliveryStateBadge({ state }: { state: DeliveryState }) {
  const t = useTranslations("deliveries.state");
  return <StatusBadge variant={variant[state]}>{t(state)}</StatusBadge>;
}
