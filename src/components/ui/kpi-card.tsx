import Link from "next/link";
import { Card } from "./card";
import { Stat } from "./stat";
import { cardClass, cx } from "./styles";

/**
 * One headline figure in its own card: the value, what it is, and an optional
 * line of context under it. With `href` the whole card is a link. Takes
 * already formatted content, so it knows nothing about the data behind it.
 */
export function KpiCard({
  value,
  label,
  hint,
  href,
  valueClass,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  valueClass?: string;
}) {
  const content = (
    <>
      <Stat value={value} label={label} valueClass={valueClass} />
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </>
  );
  if (!href) return <Card className="gap-2!">{content}</Card>;
  return (
    <Link href={href} className={cx(cardClass, "gap-2! hover:border-brand")}>
      {content}
    </Link>
  );
}
