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
