import Link from "next/link";
import { Card, CardTitle } from "./card";

export type RankedItem = {
  id: string;
  label: React.ReactNode;
  // The figure of the row, already formatted ("12 models", "€350.00").
  value: React.ReactNode;
  // Muted text next to the value ("40%").
  detail?: React.ReactNode;
  // Fill of the bar under the row, from 0 to 1. No bar when omitted.
  share?: number;
  href?: string;
  icon?: React.ReactNode;
};

// A thin bar drawn in SVG: the CSP forbids inline styles, so the width cannot be a style attribute.
function ShareBar({ share }: { share: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, share)) * 1000) / 10;
  return (
    <svg aria-hidden focusable="false" className="h-1.5 w-full">
      <rect width="100%" height="100%" rx={3} className="fill-progress-track" />
      <rect width={`${percent}%`} height="100%" rx={3} className="fill-brand" />
    </svg>
  );
}

/**
 * A titled card with rows of label, value and an optional share bar, each
 * optionally a link. Domain-agnostic: callers pass formatted content and the
 * text for the empty state. `numbered` shows the position of each row, which
 * suits rankings; turn it off for plain breakdowns.
 */
export function RankedList({
  title,
  items,
  empty,
  numbered = true,
}: {
  title: React.ReactNode;
  items: readonly RankedItem[];
  empty: React.ReactNode;
  numbered?: boolean;
}) {
  const List = numbered ? "ol" : "ul";
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {items.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <List className="flex flex-col divide-y divide-line-soft">
          {items.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  {numbered && (
                    <span aria-hidden className="w-4 shrink-0 text-[13px] font-semibold text-muted tabular-nums">
                      {index + 1}
                    </span>
                  )}
                  {item.icon}
                  {item.href ? (
                    <Link href={item.href} className="min-w-0 truncate font-semibold hover:text-brand hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="min-w-0 truncate font-semibold">{item.label}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-baseline gap-2 text-[13px]">
                  <span className="font-semibold">{item.value}</span>
                  {item.detail && <span className="text-muted">{item.detail}</span>}
                </span>
              </div>
              {item.share !== undefined && <ShareBar share={item.share} />}
            </li>
          ))}
        </List>
      )}
    </Card>
  );
}
