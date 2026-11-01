import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPublicModels } from "@/lib/portfolio";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { PortfolioNav } from "@/components/portfolio-nav";
import { SidebarNav } from "@/components/sidebar-nav";
import { cardClass, cx } from "@/components/ui/styles";

// Public pages. Same shell as the app, but the menu depends on who is looking:
// a signed-in user also gets the normal options; everyone gets the text-only
// list of finished models with photos. What is shown is decided by the explicit
// column lists in lib/portfolio.ts and the page queries.
export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const [session, publicModels, t, tp] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPublicModels(),
    getTranslations("nav"),
    getTranslations("portfolio"),
  ]);
  const user = session?.user ?? null;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-line bg-sidebar p-4 md:sticky md:top-0 md:h-dvh md:w-[232px] md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:py-6">
        <Link href="/portfolio" aria-label={tp("title")}>
          <Brand />
        </Link>
        {user && <SidebarNav />}
        <div className="flex flex-col gap-1">
          <h2 className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">
            {tp("title")}
          </h2>
          {publicModels.length === 0 ? (
            <p className="px-3 text-sm text-muted">{tp("empty")}</p>
          ) : (
            <PortfolioNav
              models={publicModels.map(({ id, name, company }) => ({ id, name, company }))}
              label={tp("title")}
            />
          )}
        </div>
        {user ? (
          <div className={cx(cardClass, "gap-0.5! p-3! md:mt-auto")}>
            <p className="text-xs text-muted">{t("signedInAs")}</p>
            <p className="truncate font-semibold">{user.name}</p>
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        ) : (
          <div className="md:mt-auto">
            <LanguageSwitcher />
          </div>
        )}
      </aside>
      <div className="min-w-0 flex-1 bg-canvas px-4 py-6 md:px-10 md:py-8">
        <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
