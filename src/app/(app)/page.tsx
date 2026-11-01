import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cardClass, cx } from "@/components/ui/styles";
import { PageHeader } from "@/components/ui/page-header";

const sections = [
  { href: "/models", key: "models" },
  { href: "/quotes", key: "quotes" },
  { href: "/clients", key: "clients" },
  { href: "/consumables", key: "consumables" },
] as const;

export default async function Home() {
  const t = await getTranslations("home");
  const tn = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tn("home")} subtitle={t("subtitle")} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className={cx(cardClass, "h-full gap-1! hover:border-input-border")}
            >
              <span className="text-lg font-bold tracking-tight">{tn(s.key)}</span>
              <span className="text-muted">{t(s.key)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
