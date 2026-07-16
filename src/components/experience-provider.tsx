"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getDictionary,
  type Dictionary,
} from "@/i18n/dictionaries";
import {
  isLocale,
  isRtl,
  type Locale,
} from "@/i18n/config";

type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

type ExperienceContextValue = {
  locale: Locale;
  theme: ThemeMode;
  dictionary: Dictionary;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  t: (section: keyof Dictionary, key: string) => string;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function resolveTheme(theme: ThemeMode) {
  if (theme === "SYSTEM") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme === "DARK" ? "dark" : "light";
}

function applyDocument(locale: Locale, theme: ThemeMode) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = isRtl(locale) ? "rtl" : "ltr";
  root.dataset.theme = resolveTheme(theme);
  try {
    localStorage.setItem("relune.locale", locale);
    localStorage.setItem("relune.theme", theme);
  } catch {
    /* ignore */
  }
}

export function ExperienceProvider({
  children,
  initialLocale = "en",
  initialTheme = "SYSTEM",
}: {
  children: ReactNode;
  initialLocale?: string;
  initialTheme?: ThemeMode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : "en",
  );
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    try {
      const storedLocale = localStorage.getItem("relune.locale");
      const storedTheme = localStorage.getItem("relune.theme");
      if (isLocale(storedLocale)) setLocaleState(storedLocale);
      if (storedTheme === "LIGHT" || storedTheme === "DARK" || storedTheme === "SYSTEM") {
        setThemeState(storedTheme);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyDocument(locale, theme);
    if (theme !== "SYSTEM") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocument(locale, theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [locale, theme]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    void fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => undefined);
  }, []);

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback(
    (section: keyof Dictionary, key: string) => {
      const bucket = dictionary[section] as Record<string, string>;
      return bucket?.[key] ?? key;
    },
    [dictionary],
  );

  const value = useMemo(
    () => ({
      locale,
      theme,
      dictionary,
      dir: isRtl(locale) ? ("rtl" as const) : ("ltr" as const),
      setLocale,
      setTheme,
      t,
    }),
    [locale, theme, dictionary, setLocale, setTheme, t],
  );

  return (
    <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
  );
}

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be used within ExperienceProvider");
  return ctx;
}
