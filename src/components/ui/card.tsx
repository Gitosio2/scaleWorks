export function Card({
  as: Tag = "section",
  className = "",
  children,
}: {
  as?: "section" | "div" | "article";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={`flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold tracking-tight">{children}</h2>;
}
