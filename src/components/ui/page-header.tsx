import Link from "next/link";

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
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center self-start font-semibold text-brand hover:text-brand-hover"
    >
      {children}
    </Link>
  );
}
