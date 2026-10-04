import type { ModelPhase } from "@/lib/labels";

const STEPS = 6;

const completed: Record<ModelPhase, number> = {
  not_started: 0,
  pending_decal_design: 1,
  pending_painting: 2,
  pending_decals: 3,
  pending_varnish: 4,
  pending_assembly: 5,
  finished: STEPS,
};

export function PhaseProgress({ phase }: { phase: ModelPhase }) {
  const done = completed[phase];
  const fill = phase === "finished" ? "bg-[#2e8b5f]" : "bg-[#3b72b8]";
  return (
    <span
      role="img"
      aria-label={`Progress: ${done} of ${STEPS} steps`}
      className="inline-flex gap-1"
    >
      {Array.from({ length: STEPS }, (_, i) => (
        <span
          key={i}
          className={`h-[5px] w-[18px] rounded-full ${i < done ? fill : "bg-[#dad5cb]"}`}
        />
      ))}
    </span>
  );
}
