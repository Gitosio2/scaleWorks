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
        <li className="inline-flex h-[22px] items-center rounded-[4px] bg-brand px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-brand-fg">
          {ttype(type as Parameters<typeof ttype>[0])}
        </li>
      )}
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-[22px] items-center rounded-[4px] border border-line px-2 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-2"
        >
          {ttag(tag as Parameters<typeof ttag>[0])}
        </li>
      ))}
    </ul>
  );
}
