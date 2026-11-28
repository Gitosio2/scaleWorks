import { captionClass } from "./styles";

// A big figure with a small caption above it. Shared by the dashboards.
export function Stat({
  value,
  label,
  valueClass = "",
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={captionClass}>{label}</span>
      <span className={`font-display text-[44px] font-bold leading-none ${valueClass}`}>{value}</span>
    </div>
  );
}
