import { useTranslations } from "next-intl";

/** Tags as small outlined chips; renders nothing when there are none. */
export function TagChips({ tags }: { tags: readonly string[] }) {
  const t = useTranslations("modelTag");
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-[22px] items-center rounded-full border border-line px-2 text-[12px] font-semibold text-ink-2"
        >
          {t(tag as Parameters<typeof t>[0])}
        </li>
      ))}
    </ul>
  );
}
