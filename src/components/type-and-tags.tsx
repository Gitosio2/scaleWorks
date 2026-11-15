"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cx, inputClass, labelClass } from "@/components/ui/styles";

/**
 * The type select plus, for the chosen type, its allowed tags as toggle chips.
 * Submits `type` (one value) and `tags` (one entry per checked chip). Changing the
 * type drops the checked tags the new type does not allow; the server validates
 * again (see lib/tags.ts). `tagsByType` is the allowed-tags map, passed from the server.
 */
export function TypeAndTags({
  types,
  tagsByType,
  typeLabel,
  noTypeLabel,
  tagsLabel,
  defaultType,
  defaultTags,
}: {
  types: readonly string[];
  tagsByType: Partial<Record<string, readonly string[]>>;
  typeLabel: string;
  noTypeLabel: string;
  tagsLabel: string;
  defaultType: string | null;
  defaultTags: readonly string[];
}) {
  const ttype = useTranslations("modelType");
  const ttag = useTranslations("modelTag");
  const thint = useTranslations("typeTags");
  const [type, setType] = useState(defaultType ?? "");
  const [tags, setTags] = useState<readonly string[]>(defaultTags);
  const allowed = tagsByType[type] ?? [];

  function changeType(next: string) {
    setType(next);
    const nextAllowed = tagsByType[next] ?? [];
    setTags((current) => current.filter((tag) => nextAllowed.includes(tag)));
  }

  function toggle(tag: string, checked: boolean) {
    setTags((current) => (checked ? [...current, tag] : current.filter((x) => x !== tag)));
  }

  return (
    <>
      <label className={labelClass}>
        {typeLabel}
        <select
          name="type"
          value={type}
          onChange={(event) => changeType(event.target.value)}
          className={inputClass}
        >
          <option value="">{noTypeLabel}</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {ttype(value as Parameters<typeof ttype>[0])}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="pb-1.5 text-[13px] font-semibold text-ink-2">{tagsLabel}</legend>
        {allowed.length === 0 ? (
          <p className="text-[13px] text-muted">{thint(type ? "noTags" : "pickType")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowed.map((tag) => (
              <label
                key={tag}
                className={cx(
                  "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-input-border bg-input px-3 text-[13px] font-semibold text-ink-2",
                  "has-[:checked]:border-ok has-[:checked]:bg-ok has-[:checked]:text-brand-fg",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ok",
                )}
              >
                <input
                  type="checkbox"
                  name="tags"
                  value={tag}
                  checked={tags.includes(tag)}
                  onChange={(event) => toggle(tag, event.target.checked)}
                  className="sr-only"
                />
                {tags.includes(tag) && (
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                )}
                {ttag(tag as Parameters<typeof ttag>[0])}
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );
}
