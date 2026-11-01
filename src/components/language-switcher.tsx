"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

// Inline SVGs: emoji flags render as plain letters on Windows.
const flags: Record<Locale, React.ReactNode> = {
  en: (
    <svg viewBox="0 0 60 40" className="h-full w-full" aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  ),
  es: (
    <svg viewBox="0 0 60 40" className="h-full w-full" aria-hidden="true">
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </svg>
  ),
};

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("language");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      // The action sets a cookie, so Next returns the re-rendered UI itself.
      await setLocale(next);
    });
  }

  return (
    <div role="group" aria-label={t("label")} className={`flex gap-2 ${className}`}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => select(l)}
          disabled={pending}
          aria-pressed={l === locale}
          aria-label={t(l)}
          title={t(l)}
          className={`h-6 w-9 overflow-hidden rounded border transition ${
            l === locale
              ? "border-brand ring-2 ring-brand/30"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
        >
          {flags[l]}
        </button>
      ))}
    </div>
  );
}
