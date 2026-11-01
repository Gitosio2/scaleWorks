import { cardClass, cx } from "./styles";

export function Card({
  as: Tag = "section",
  className = "",
  children,
}: {
  as?: "section" | "div" | "article";
  className?: string;
  children: React.ReactNode;
}) {
  return <Tag className={cx(cardClass, className)}>{children}</Tag>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold tracking-tight">{children}</h2>;
}

/**
 * Card whose title toggles its content, using a native <details> (no JS,
 * keyboard accessible). Collapsed by default. The open state lives in the DOM,
 * so it survives the re-renders that server actions trigger.
 */
export function CollapsibleCard({
  title,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[14px] border border-line bg-surface p-5"
    >
      <summary className="-m-1 flex cursor-pointer list-none items-center justify-between gap-3 rounded-[10px] p-1 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        <CardTitle>{title}</CardTitle>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}
