import { useTranslations } from "next-intl";

/**
 * The type as a filled, highlighted first chip, followed by the tags as small
 * outlined chips. Renders nothing when there is neither a type nor any tag.
 */
export function TagChips({ type, tags }: { type?: string | null; tags: readonly string[] }) {
  const ttype = useTranslations("modelType");
  const ttag = useTranslations("modelTag");
  if (!type && tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {type && (
        <li className="inline-flex h-[22px] items-center rounded-full bg-brand px-2.5 text-[12px] font-semibold text-brand-fg">
          {ttype(type as Parameters<typeof ttype>[0])}
        </li>
      )}
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-[22px] items-center rounded-full border border-line px-2 text-[12px] font-semibold text-ink-2"
        >
          {ttag(tag as Parameters<typeof ttag>[0])}
        </li>
      ))}
    </ul>
  );
}
