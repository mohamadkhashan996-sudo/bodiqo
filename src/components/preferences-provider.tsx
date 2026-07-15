"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PREF_COOKIE,
  convertAmount,
  detectBrowserLocale,
  formatMoney,
  getCachedMessages,
  getLanguage,
  resolveTheme,
  setMessageCache,
  translate,
  type CurrencyDef,
  type LanguageDef,
  type ThemeMode,
} from "@/lib/i18n";

type ConfigPayload = {
  languages: LanguageDef[];
  currencies: CurrencyDef[];
  defaults: {
    language: string;
    currency: string;
    catalogCurrency: string;
    rateBaseCurrency: string;
    theme: ThemeMode;
    detectBrowserLanguage: boolean;
    allowThemeSwitch: boolean;
  };
  rates: Record<string, number>;
};

type PreferencesContextValue = {
  ready: boolean;
  locale: string;
  currency: string;
  theme: ThemeMode;
  dir: "ltr" | "rtl";
  languages: LanguageDef[];
  currencies: CurrencyDef[];
  allowThemeSwitch: boolean;
  t: (key: string) => string;
  setLocale: (code: string) => void;
  setCurrency: (code: string) => void;
  setTheme: (mode: ThemeMode) => void;
  formatPrice: (amountInCatalogCurrency: number) => string;
  convertFromCatalog: (amountInCatalogCurrency: number) => number;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function applyDocument(locale: string, theme: ThemeMode) {
  const lang = getLanguage(locale);
  const dir = lang?.dir || "ltr";
  const resolved = resolveTheme(theme);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-mode", theme);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [locale, setLocaleState] = useState("en");
  const [currency, setCurrencyState] = useState("ILS");
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [messages, setMessages] = useState<Record<string, string>>({});

  const loadMessages = useCallback(async (code: string) => {
    const cached = getCachedMessages(code);
    if (cached) {
      setMessages(cached);
      return;
    }
    const res = await fetch(`/api/i18n/messages/${code}`);
    if (!res.ok) return;
    const dict = (await res.json()) as Record<string, string>;
    setMessageCache(code, dict);
    setMessages(dict);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/i18n/config");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as ConfigPayload;
      setConfig(data);

      const enabledLangs = data.languages.map((l) => l.code);
      const cookieLocale = readCookie(PREF_COOKIE.locale);
      const cookieCurrency = readCookie(PREF_COOKIE.currency);
      const cookieTheme = readCookie(PREF_COOKIE.theme) as ThemeMode | null;
      const storedTheme =
        (typeof localStorage !== "undefined" &&
          (localStorage.getItem(PREF_COOKIE.theme) as ThemeMode | null)) ||
        null;

      let nextLocale = data.defaults.language;
      if (cookieLocale && enabledLangs.includes(cookieLocale)) {
        nextLocale = cookieLocale;
      } else if (data.defaults.detectBrowserLanguage) {
        nextLocale = detectBrowserLocale(enabledLangs, data.defaults.language);
      }

      const enabledCurrencies = data.currencies.map((c) => c.code);
      let nextCurrency = data.defaults.currency;
      if (cookieCurrency && enabledCurrencies.includes(cookieCurrency)) {
        nextCurrency = cookieCurrency;
      }

      const nextTheme =
        cookieTheme ||
        storedTheme ||
        data.defaults.theme ||
        "dark";

      setLocaleState(nextLocale);
      setCurrencyState(nextCurrency);
      setThemeState(nextTheme);
      applyDocument(nextLocale, nextTheme);
      await loadMessages(nextLocale);
      if (!cancelled) setReady(true);
    })().catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [loadMessages]);

  useEffect(() => {
    if (!ready) return;
    applyDocument(locale, theme);
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (theme === "system") applyDocument(locale, theme);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [locale, theme, ready]);

  const setLocale = useCallback(
    (code: string) => {
      setLocaleState(code);
      writeCookie(PREF_COOKIE.locale, code);
      void loadMessages(code);
    },
    [loadMessages],
  );

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    writeCookie(PREF_COOKIE.currency, code);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    writeCookie(PREF_COOKIE.theme, mode);
    try {
      localStorage.setItem(PREF_COOKIE.theme, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const catalogCurrency = config?.defaults.catalogCurrency || "ILS";
  const rateBase = config?.defaults.rateBaseCurrency || "USD";
  const rates = config?.rates || { USD: 1 };

  const value = useMemo<PreferencesContextValue>(() => {
    const dir = getLanguage(locale)?.dir || "ltr";
    return {
      ready,
      locale,
      currency,
      theme,
      dir,
      languages: config?.languages || [],
      currencies: config?.currencies || [],
      allowThemeSwitch: config?.defaults.allowThemeSwitch ?? true,
      t: (key: string) => translate(locale, key, messages),
      setLocale,
      setCurrency,
      setTheme,
      convertFromCatalog: (amount) =>
        convertAmount(amount, catalogCurrency, currency, rates, rateBase),
      formatPrice: (amount) =>
        formatMoney(
          convertAmount(amount, catalogCurrency, currency, rates, rateBase),
          currency,
          locale,
        ),
    };
  }, [
    ready,
    locale,
    currency,
    theme,
    config,
    messages,
    setLocale,
    setCurrency,
    setTheme,
    catalogCurrency,
    rates,
    rateBase,
  ]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}

/** Safe hook for optional use outside provider */
export function usePreferencesOptional() {
  return useContext(PreferencesContext);
}
