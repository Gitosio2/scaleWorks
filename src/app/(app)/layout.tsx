import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { SidebarNav } from "@/components/sidebar-nav";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cardClass, cx } from "@/components/ui/styles";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("nav");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-line bg-sidebar p-4 md:sticky md:top-0 md:h-dvh md:w-[232px] md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:py-6">
        <Brand />
        <SidebarNav />
        <div className={cx(cardClass, "gap-0.5! p-3! md:mt-auto")}>
          <p className="text-xs text-muted">{t("signedInAs")}</p>
          <p className="truncate font-semibold">{user.name}</p>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1 bg-canvas px-4 py-6 md:px-10 md:py-8">
        <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
