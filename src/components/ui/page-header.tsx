import Link from "next/link";
import { cx, inlineLinkClass } from "./styles";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-3">
        <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.9] tracking-tight md:text-[56px]">
          {title}
        </h1>
        {subtitle && <p className="text-[17px] text-muted">{subtitle}</p>}
        <div aria-hidden className="hazard-stripe h-2 w-40 rounded-[2px]" />
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx("inline-flex min-h-11 items-center self-start", inlineLinkClass)}
    >
      {children}
    </Link>
  );
}
