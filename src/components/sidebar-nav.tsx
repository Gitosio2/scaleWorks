"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { isGroupActive, isPathActive } from "@/lib/nav-groups";

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


type NavLink = { href: string; label: "home" | "models" | "quotes" | "clients" | "consumables" | "components" | "expenses" | "gallery"; icon: React.ReactNode };
type NavGroup = { label: "warehouse"; icon: React.ReactNode; children: NavLink[] };

const items: Array<NavLink | NavGroup> = [
  {
    href: "/",
    label: "home" as const,
    icon: (
      <svg {...icon}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v10h13V10" />
      </svg>
    ),
  },
  {
    href: "/models",
    label: "models" as const,
    icon: (
      <svg {...icon}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </svg>
    ),
  },
  {
    href: "/quotes",
    label: "quotes" as const,
    icon: (
      <svg {...icon}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h7M9 17h7" />
      </svg>
    ),
  },
  {
    href: "/clients",
    label: "clients" as const,
    icon: (
      <svg {...icon}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .8 3.5 2.6 3.5 5.6" />
      </svg>
    ),
  },
  {
    label: "warehouse" as const,
    icon: (
      <svg {...icon}>
        <path d="M3 9.5 12 4l9 5.5" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
    children: [
      {
        href: "/consumables",
        label: "consumables" as const,
        icon: (
          <svg {...icon}>
            <path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3z" />
            <path d="M7 13h10" />
          </svg>
        ),
      },
      {
        href: "/components",
        label: "components" as const,
        icon: (
          <svg {...icon}>
            <rect x="7" y="7" width="10" height="10" rx="1.5" />
            <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" />
          </svg>
        ),
      },
    ],
  },
  {
    href: "/expenses",
    label: "expenses" as const,
    icon: (
      <svg {...icon}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <path d="M9.5 8h5M9.5 12h5" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "gallery" as const,
    icon: (
      <svg {...icon}>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m20.5 16-5-5-8 8" />
      </svg>
    ),
  },
];

const linkClass = (active: boolean) =>
  `flex min-h-11 items-center gap-3 rounded-[10px] px-3 ${
    active ? "bg-brand font-semibold text-brand-fg" : "text-ink-2 hover:bg-line"
  }`;

function NavItemLink({ item, pathname, nested }: { item: NavLink; pathname: string; nested?: boolean }) {
  const t = useTranslations("nav");
  const active = isPathActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${linkClass(active)}${nested ? " ml-3" : ""}`}
    >
      {item.icon}
      {t(item.label)}
    </Link>
  );
}

// Collapsible parent. It is held open while one of its children is the current
// page; otherwise the button toggles it.
function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const t = useTranslations("nav");
  const [expanded, setExpanded] = useState(false);
  const childActive = isGroupActive(pathname, group.children);
  const open = childActive || expanded;
  const panelId = `nav-group-${group.label}`;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
        className={`${linkClass(false)} w-full cursor-pointer text-left ${childActive ? "font-semibold text-ink" : ""}`}
      >
        {group.icon}
        <span className="flex-1">{t(group.label)}</span>
        <svg
          {...icon}
          width={16}
          height={16}
          className={open ? "rotate-180" : undefined}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-1">
        {group.children.map((child) => (
          <NavItemLink key={child.href} item={child} pathname={pathname} nested />
        ))}
      </div>
    </div>
  );
}

export function SidebarNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("main")} className="flex flex-col gap-1">
      {items.map((item) =>
        "children" in item ? (
          <NavGroupItem key={item.label} group={item} pathname={pathname} />
        ) : (
          <NavItemLink key={item.href} item={item} pathname={pathname} />
        ),
      )}
    </nav>
  );
}
