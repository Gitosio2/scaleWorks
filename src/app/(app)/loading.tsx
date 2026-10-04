import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-7" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 rounded-[10px] bg-line" />
        <div className="h-4 w-72 max-w-full rounded-[10px] bg-line-soft" />
      </div>
      <Card>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border-t border-line-soft pt-4 first:border-t-0 first:pt-0"
          >
            <div className="h-5 w-1/3 rounded-[10px] bg-line" />
            <div className="h-4 w-2/3 rounded-[10px] bg-line-soft" />
          </div>
        ))}
      </Card>
    </div>
  );
}
