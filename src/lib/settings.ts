import { prisma } from "@/lib/prisma";
import {
  SETTING_KEYS,
  cryptoSettingsSchema,
  homepageSettingsSchema,
  paypalSettingsSchema,
  seoSettingsSchema,
  setupSettingsSchema,
  shippingSettingsSchema,
  smtpSettingsSchema,
  storeSettingsSchema,
  stripeSettingsSchema,
  taxSettingsSchema,
  type CryptoSettings,
  type HomepageSettings,
  type PaypalSettings,
  type SeoSettings,
  type SettingKey,
  type SetupSettings,
  type ShippingSettings,
  type SmtpSettings,
  type StoreSettings,
  type StripeSettings,
  type TaxSettings,
} from "@/lib/settings-schema";

type SettingsMap = {
  [SETTING_KEYS.store]: StoreSettings;
  [SETTING_KEYS.paypal]: PaypalSettings;
  [SETTING_KEYS.stripe]: StripeSettings;
  [SETTING_KEYS.crypto]: CryptoSettings;
  [SETTING_KEYS.tax]: TaxSettings;
  [SETTING_KEYS.smtp]: SmtpSettings;
  [SETTING_KEYS.shipping]: ShippingSettings;
  [SETTING_KEYS.seo]: SeoSettings;
  [SETTING_KEYS.homepage]: HomepageSettings;
  [SETTING_KEYS.setup]: SetupSettings;
};

const parsers = {
  [SETTING_KEYS.store]: storeSettingsSchema,
  [SETTING_KEYS.paypal]: paypalSettingsSchema,
  [SETTING_KEYS.stripe]: stripeSettingsSchema,
  [SETTING_KEYS.crypto]: cryptoSettingsSchema,
  [SETTING_KEYS.tax]: taxSettingsSchema,
  [SETTING_KEYS.smtp]: smtpSettingsSchema,
  [SETTING_KEYS.shipping]: shippingSettingsSchema,
  [SETTING_KEYS.seo]: seoSettingsSchema,
  [SETTING_KEYS.homepage]: homepageSettingsSchema,
  [SETTING_KEYS.setup]: setupSettingsSchema,
} as const;

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingsMap[K]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    const parser = parsers[key];
    if (!row) return parser.parse({}) as SettingsMap[K];
    return parser.parse(row.value) as SettingsMap[K];
  } catch {
    return parsers[key].parse({}) as SettingsMap[K];
  }
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: unknown,
): Promise<SettingsMap[K]> {
  const parsed = parsers[key].parse(value) as SettingsMap[K];
  await prisma.setting.upsert({
    where: { key },
    update: { value: parsed },
    create: { key, value: parsed },
  });
  return parsed;
}

export async function getAllSettings() {
  const [
    store,
    paypal,
    stripe,
    crypto,
    tax,
    smtp,
    shipping,
    seo,
    homepage,
    setup,
  ] = await Promise.all([
    getSetting(SETTING_KEYS.store),
    getSetting(SETTING_KEYS.paypal),
    getSetting(SETTING_KEYS.stripe),
    getSetting(SETTING_KEYS.crypto),
    getSetting(SETTING_KEYS.tax),
    getSetting(SETTING_KEYS.smtp),
    getSetting(SETTING_KEYS.shipping),
    getSetting(SETTING_KEYS.seo),
    getSetting(SETTING_KEYS.homepage),
    getSetting(SETTING_KEYS.setup),
  ]);
  return {
    store,
    paypal,
    stripe,
    crypto,
    tax,
    smtp,
    shipping,
    seo,
    homepage,
    setup,
  };
}

export async function ensureDefaultSettings() {
  for (const key of Object.values(SETTING_KEYS)) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      await setSetting(key, {});
    }
  }
}
