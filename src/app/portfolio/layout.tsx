import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { modelTitle } from "@/lib/model-title";
import { getPublicModels } from "@/lib/portfolio";
import { socialLinks } from "@/lib/share";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { PortfolioNav } from "@/components/portfolio-nav";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarShell } from "@/components/sidebar-shell";
import { SocialIcon } from "@/components/ui/social-icon";
import { cardClass, cx, linkActionClass, secondaryButtonClass } from "@/components/ui/styles";

const SOCIAL_NAMES = { tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" } as const;

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
  const socials = socialLinks({
    tiktok: process.env.PORTFOLIO_TIKTOK,
    instagram: process.env.PORTFOLIO_INSTAGRAM,
    facebook: process.env.PORTFOLIO_FACEBOOK,
  });

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <SidebarShell
        brand={
          <Link href="/portfolio" aria-label={tp("title")}>
            <Brand />
          </Link>
        }
      >
        {user && <SidebarNav />}
        <div className="flex flex-col gap-1">
          <h2 className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">
            {tp("title")}
          </h2>
          {publicModels.length === 0 ? (
            <p className="px-3 text-sm text-muted">{tp("empty")}</p>
          ) : (
            <PortfolioNav
              models={publicModels.map(({ id, brand, name, company }) => ({
                id,
                name: modelTitle(brand, name),
                company,
              }))}
              label={tp("title")}
            />
          )}
        </div>
        {user ? (
          <div className={cx(cardClass, "gap-0.5! p-3! md:mt-auto")}>
            <p className="text-xs text-muted">{t("signedInAs")}</p>
            <p className="truncate font-semibold">{user.name}</p>
            <LanguageSwitcher />
            <Link href="/backup" className={linkActionClass}>{t("backup")}</Link>
            <LogoutButton />
          </div>
        ) : (
          <div className="md:mt-auto">
            <LanguageSwitcher />
          </div>
        )}
      </SidebarShell>
      <div className="min-w-0 flex-1 bg-canvas px-4 py-6 md:px-10 md:py-8">
        <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 pb-12">
          {children}
          {socials.length > 0 && (
            <section className={cx(cardClass, "items-start")}>
              <h2 className="text-lg font-bold">{tp("followTitle")}</h2>
              <p className="font-bold">{tp("followText")}</p>
              <ul className="flex flex-wrap gap-3">
                {socials.map(({ key, href }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_NAMES[key]}
                      title={SOCIAL_NAMES[key]}
                      className={cx(secondaryButtonClass, "size-16 px-0")}
                    >
                      <SocialIcon name={key} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
