import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

const sections = [
  { href: "/models", title: "Models", text: "Track phases, time, parts and consumables." },
  { href: "/quotes", title: "Quotes", text: "Prepare quotes and convert accepted ones to models." },
  { href: "/clients", title: "Clients", text: "Keep your clients and their contact details." },
  { href: "/consumables", title: "Consumables", text: "Paints, glues and other supplies you use." },
];

export default function Home() {
  return (
    <>
      <PageHeader
        title="Home"
        subtitle="Manage your scale models, quotes, parts and hours."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full flex-col gap-1 rounded-[14px] border border-line bg-surface p-5 hover:border-input-border"
            >
              <span className="text-lg font-bold tracking-tight">{s.title}</span>
              <span className="text-muted">{s.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
