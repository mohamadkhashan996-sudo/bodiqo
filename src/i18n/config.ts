export const LOCALES = [
  "en",
  "ar",
  "he",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "ru",
  "tr",
  "ja",
  "ko",
  "zh",
  "hi",
  "nl",
  "sv",
  "no",
  "da",
  "pl",
  "el",
  "ro",
  "uk",
] as const;

export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES = new Set<Locale>(["ar", "he"]);

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  he: "עברית",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  hi: "हिन्दी",
  nl: "Nederlands",
  sv: "Svenska",
  no: "Norsk",
  da: "Dansk",
  pl: "Polski",
  el: "Ελληνικά",
  ro: "Română",
  uk: "Українська",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function isRtl(locale: Locale) {
  return RTL_LOCALES.has(locale);
}
