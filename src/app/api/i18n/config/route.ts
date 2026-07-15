import { NextResponse } from "next/server";
import { ALL_CURRENCIES, ALL_LANGUAGES } from "@/lib/i18n";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-schema";

export async function GET() {
  const loc = await getSetting(SETTING_KEYS.localization);
  const languages = ALL_LANGUAGES.filter((l) =>
    loc.enabledLanguages.includes(l.code),
  );
  const currencies = ALL_CURRENCIES.filter((c) =>
    loc.enabledCurrencies.includes(c.code),
  );

  return NextResponse.json({
    languages,
    currencies,
    allLanguages: ALL_LANGUAGES,
    allCurrencies: ALL_CURRENCIES,
    defaults: {
      language: loc.defaultLanguage,
      currency: loc.defaultCurrency,
      catalogCurrency: loc.catalogCurrency,
      rateBaseCurrency: loc.rateBaseCurrency,
      theme: loc.defaultTheme,
      detectBrowserLanguage: loc.detectBrowserLanguage,
      allowThemeSwitch: loc.allowThemeSwitch,
    },
    rates: loc.rates,
    enabledLanguages: loc.enabledLanguages,
    enabledCurrencies: loc.enabledCurrencies,
  });
}
