export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

// BCP 47 tags handed to Intl for number and date formatting.
export const intlLocales: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
};

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.some((l) => l === value);
}
