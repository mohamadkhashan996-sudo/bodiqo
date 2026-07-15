import languagesData from "@/i18n/languages.json";
import currenciesData from "@/i18n/currencies.json";
import en from "@/i18n/messages/en.json";

export type LanguageDef = {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
};

export type CurrencyDef = {
  code: string;
  symbol: string;
  name: string;
};

export type ThemeMode = "light" | "dark" | "system";

/** Add languages in src/i18n/languages.json + a matching messages/{code}.json — no TS changes required. */
export const ALL_LANGUAGES = languagesData.languages as LanguageDef[];
/** Add currencies in src/i18n/currencies.json — no TS changes required. */
export const ALL_CURRENCIES = currenciesData.currencies as CurrencyDef[];

const messageCache: Record<string, Record<string, string>> = {
  en: en as Record<string, string>,
};

export function getLanguage(code: string) {
  return ALL_LANGUAGES.find((l) => l.code === code);
}

export function getCurrency(code: string) {
  return ALL_CURRENCIES.find((c) => c.code === code);
}

export function translate(
  locale: string,
  key: string,
  dict?: Record<string, string>,
): string {
  const active = dict || messageCache[locale] || messageCache.en;
  return active[key] || messageCache.en[key] || key;
}

export function setMessageCache(locale: string, dict: Record<string, string>) {
  messageCache[locale] = dict;
}

export function getCachedMessages(locale: string) {
  return messageCache[locale];
}

export function detectBrowserLocale(enabled: string[], fallback = "en") {
  if (typeof navigator === "undefined") return fallback;
  const candidates = [...(navigator.languages || []), navigator.language].filter(
    Boolean,
  );
  for (const raw of candidates) {
    const code = raw.toLowerCase().split("-")[0];
    if (enabled.includes(code)) return code;
  }
  return enabled.includes(fallback) ? fallback : enabled[0] || "en";
}

/**
 * Convert amount between currencies.
 * `rates` are expressed as units of currency per 1 unit of `baseCurrency`.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
  baseCurrency: string,
) {
  if (fromCurrency === toCurrency) return amount;
  const fromRate =
    fromCurrency === baseCurrency ? 1 : (rates[fromCurrency] ?? 1);
  const toRate = toCurrency === baseCurrency ? 1 : (rates[toCurrency] ?? 1);
  const inBase = amount / (fromRate || 1);
  return inBase * (toRate || 1);
}

export function formatMoney(amount: number, currency: string, locale = "en") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "KWD" ? 3 : currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export const PREF_COOKIE = {
  locale: "bodiqo_locale",
  currency: "bodiqo_currency",
  theme: "bodiqo_theme",
} as const;
