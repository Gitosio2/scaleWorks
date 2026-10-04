import { phaseLabels, type ModelPhase } from "@/lib/labels";

export type BadgeVariant = "info" | "warn" | "ok" | "bad" | "mute";

const variants: Record<BadgeVariant, string> = {
  info: "bg-[#dce8f6] text-[#1d4a85]",
  warn: "bg-[#fbe7c6] text-[#7c4306]",
  ok: "bg-[#d6ede2] text-[#11603b]",
  bad: "bg-[#f6d9d5] text-[#8e2a20]",
  mute: "bg-[#e7e3db] text-[#4f4b44]",
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
