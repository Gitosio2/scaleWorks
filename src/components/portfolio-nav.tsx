"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavModel = { id: string; name: string; company: string | null };

/** Text-only list of the public models (name and company), current one highlighted. */
export function PortfolioNav({ models, label }: { models: NavModel[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
      {models.map((m) => {
        const href = `/portfolio/${m.id}`;
        const active = pathname === href;
        return (
          <Link
            key={m.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 min-w-0 flex-col justify-center rounded-[10px] px-3 py-1.5 ${
              active
                ? "bg-brand font-semibold text-brand-fg"
                : "text-ink-2 hover:bg-line"
            }`}
          >
            <span className="truncate">{m.name}</span>
            {m.company && (
              <span
                className={`truncate text-xs font-normal ${active ? "text-brand-fg/80" : "text-muted"}`}
              >
                {m.company}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
