"use client";

import { FormEvent, useEffect, useState } from "react";
import { ALL_CURRENCIES, ALL_LANGUAGES, type ThemeMode } from "@/lib/i18n";

type LocForm = {
  enabledLanguages: string[];
  defaultLanguage: string;
  detectBrowserLanguage: boolean;
  enabledCurrencies: string[];
  defaultCurrency: string;
  catalogCurrency: string;
  rateBaseCurrency: string;
  rates: Record<string, number>;
  defaultTheme: ThemeMode;
  allowThemeSwitch: boolean;
};

export function LocalizationManager() {
  const [form, setForm] = useState<LocForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const loc = d.localization || {};
        setForm({
          enabledLanguages: loc.enabledLanguages || ["en"],
          defaultLanguage: loc.defaultLanguage || "en",
          detectBrowserLanguage: loc.detectBrowserLanguage !== false,
          enabledCurrencies: loc.enabledCurrencies || ["USD", "EUR", "ILS"],
          defaultCurrency: loc.defaultCurrency || "ILS",
          catalogCurrency: loc.catalogCurrency || "ILS",
          rateBaseCurrency: loc.rateBaseCurrency || "USD",
          rates: loc.rates || { USD: 1 },
          defaultTheme: loc.defaultTheme || "dark",
          allowThemeSwitch: loc.allowThemeSwitch !== false,
        });
      })
      .catch(() => setError("Failed to load localization settings"));
  }, []);

  function toggleLang(code: string) {
    if (!form) return;
    const set = new Set(form.enabledLanguages);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    const enabledLanguages = [...set];
    if (!enabledLanguages.length) return;
    setForm({
      ...form,
      enabledLanguages,
      defaultLanguage: enabledLanguages.includes(form.defaultLanguage)
        ? form.defaultLanguage
        : enabledLanguages[0],
    });
  }

  function toggleCurrency(code: string) {
    if (!form) return;
    const set = new Set(form.enabledCurrencies);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    const enabledCurrencies = [...set];
    if (!enabledCurrencies.length) return;
    setForm({
      ...form,
      enabledCurrencies,
      defaultCurrency: enabledCurrencies.includes(form.defaultCurrency)
        ? form.defaultCurrency
        : enabledCurrencies[0],
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "localization", value: form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setForm(data.value);
    setMessage("Localization settings saved. Storefront updates on refresh.");
  }

  if (!form) {
    return <p className="text-sm text-[#f3efe6]/55">{error || "Loading…"}</p>;
  }

  return (
    <form onSubmit={onSave} className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Languages & currencies
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Enable languages/currencies, set defaults, theme, and exchange rates —
          no code changes. Add new locales by dropping a JSON file in{" "}
          <code className="text-[#4a8cff]">src/i18n/messages/</code> and listing
          it in <code className="text-[#4a8cff]">languages.json</code>.
        </p>
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6">
        <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
          Languages
        </h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.detectBrowserLanguage}
            onChange={(e) =>
              setForm({ ...form, detectBrowserLanguage: e.target.checked })
            }
          />
          Detect visitor browser language
        </label>
        <label className="block text-sm">
          <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
            Default language
          </span>
          <select
            value={form.defaultLanguage}
            onChange={(e) =>
              setForm({ ...form, defaultLanguage: e.target.value })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
          >
            {ALL_LANGUAGES.filter((l) =>
              form.enabledLanguages.includes(l.code),
            ).map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.code}) {l.dir === "rtl" ? "· RTL" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_LANGUAGES.map((l) => (
            <label
              key={l.code}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={form.enabledLanguages.includes(l.code)}
                onChange={() => toggleLang(l.code)}
              />
              <span>
                {l.nativeName}
                <span className="ms-1 text-[10px] text-[#f3efe6]/40">
                  {l.code}
                  {l.dir === "rtl" ? " · RTL" : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6">
        <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
          Currencies & rates
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
              Default currency
            </span>
            <select
              value={form.defaultCurrency}
              onChange={(e) =>
                setForm({ ...form, defaultCurrency: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
            >
              {form.enabledCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
              Catalog currency
            </span>
            <select
              value={form.catalogCurrency}
              onChange={(e) =>
                setForm({ ...form, catalogCurrency: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
              Rate base
            </span>
            <select
              value={form.rateBaseCurrency}
              onChange={(e) =>
                setForm({ ...form, rateBaseCurrency: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_CURRENCIES.map((c) => (
            <label
              key={c.code}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={form.enabledCurrencies.includes(c.code)}
                onChange={() => toggleCurrency(c.code)}
              />
              {c.code} · {c.symbol}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {form.enabledCurrencies.map((code) => (
            <label key={code} className="block text-sm">
              <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
                Rate {code} / 1 {form.rateBaseCurrency}
              </span>
              <input
                type="number"
                step="any"
                value={form.rates[code] ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rates: {
                      ...form.rates,
                      [code]: Number(e.target.value),
                    },
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-[#f3efe6]/40">
          Rates are manual today and API-ready (same shape) for a future FX feed.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6">
        <h2 className="text-[11px] tracking-[0.16em] text-[#f3efe6]/45 uppercase">
          Theme defaults
        </h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.allowThemeSwitch}
            onChange={(e) =>
              setForm({ ...form, allowThemeSwitch: e.target.checked })
            }
          />
          Allow customers to switch theme
        </label>
        <label className="block text-sm">
          <span className="text-[11px] tracking-[0.14em] text-[#f3efe6]/45 uppercase">
            Default theme
          </span>
          <select
            value={form.defaultTheme}
            onChange={(e) =>
              setForm({
                ...form,
                defaultTheme: e.target.value as ThemeMode,
              })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save localization"}
      </button>
    </form>
  );
}
