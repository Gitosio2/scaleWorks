// A big figure with a caption under it. Shared by the dashboards.
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
    <div className="flex flex-col gap-0.5">
      <span className={`text-3xl font-bold tracking-tight ${valueClass}`}>{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}
