import { useTranslations } from "next-intl";
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
  const t = useTranslations("common");
  const done = completed[phase];
  // Done steps are solid. The step in hand is safety yellow with an ink ring,
  // so it does not rely on colour alone; before the first step and once
  // finished there is no step in hand. The rest is track.
  const inProgress = phase !== "not_started" && phase !== "finished";
  function segment(i: number) {
    if (i < done) return phase === "finished" ? "bg-progress-done" : "bg-progress";
    if (i === done && inProgress) return "bg-accent ring-1 ring-ink";
    return "bg-progress-track";
  }
  return (
    <span
      role="img"
      aria-label={t("progress", { done, total: STEPS })}
      className="inline-flex gap-1"
    >
      {Array.from({ length: STEPS }, (_, i) => (
        <span key={i} className={`h-2 w-[22px] rounded-[2px] ${segment(i)}`} />
      ))}
    </span>
  );
}
