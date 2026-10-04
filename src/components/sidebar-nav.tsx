"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const items = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg {...icon}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v10h13V10" />
      </svg>
    ),
  },
  {
    href: "/models",
    label: "Models",
    icon: (
      <svg {...icon}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </svg>
    ),
  },
  {
    href: "/quotes",
    label: "Quotes",
    icon: (
      <svg {...icon}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h7M9 17h7" />
      </svg>
    ),
  },
  {
    href: "/clients",
    label: "Clients",
    icon: (
      <svg {...icon}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .8 3.5 2.6 3.5 5.6" />
      </svg>
    ),
  },
  {
    href: "/consumables",
    label: "Consumables",
    icon: (
      <svg {...icon}>
        <path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3z" />
        <path d="M7 13h10" />
      </svg>
    ),
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 md:flex-col">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 ${
              active
                ? "bg-brand font-semibold text-brand-fg"
                : "text-ink-2 hover:bg-line"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
