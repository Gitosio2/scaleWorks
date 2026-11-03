import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarShell } from "@/components/sidebar-shell";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cardClass, cx, linkActionClass } from "@/components/ui/styles";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("nav");
  // Quotes still to be prepared; shown as a badge next to "Quotes" in the sidebar.
  const [{ draftQuotes }] = await db
    .select({ draftQuotes: sql<number>`count(*)::int` })
    .from(quotes)
    .where(and(eq(quotes.userId, user.id), eq(quotes.status, "draft")));

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <SidebarShell brand={<Brand />}>
        <SidebarNav badges={{ quotes: draftQuotes }} />
        <div className={cx(cardClass, "gap-0.5! p-3! md:mt-auto")}>
          <p className="text-xs text-muted">{t("signedInAs")}</p>
          <p className="truncate font-semibold">{user.name}</p>
          <LanguageSwitcher />
          <Link href="/backup" className={linkActionClass}>{t("backup")}</Link>
          <LogoutButton />
        </div>
      </SidebarShell>
      <div className="min-w-0 flex-1 bg-canvas px-4 py-6 md:px-10 md:py-8">
        <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
