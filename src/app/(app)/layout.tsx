import { SidebarNav } from "@/components/sidebar-nav";
import { LogoutButton } from "@/components/logout-button";
import { cardClass, cx } from "@/components/ui/styles";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-line bg-sidebar p-4 md:w-[232px] md:border-r md:border-b-0 md:py-6">
        <div className="flex items-center gap-2.5 px-1">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-[9px] bg-brand font-bold text-brand-fg"
          >
            S
          </span>
          <span className="text-lg font-bold tracking-tight">scaleWorks</span>
        </div>
        <SidebarNav />
        <div className={cx(cardClass, "gap-0.5! p-3! md:mt-auto")}>
          <p className="text-xs text-muted">Signed in as</p>
          <p className="truncate font-semibold">{user.name}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1 bg-canvas px-4 py-6 md:px-10 md:py-8">
        <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-7">
          {children}
        </main>
      </div>
    </div>
  );
}
