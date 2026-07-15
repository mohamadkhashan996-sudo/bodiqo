import { prisma } from "@/lib/prisma";
import {
  SETTING_KEYS,
  backupSettingsSchema,
  cryptoSettingsSchema,
  homepageSettingsSchema,
  localizationSettingsSchema,
  paypalSettingsSchema,
  seoSettingsSchema,
  setupSettingsSchema,
  shippingSettingsSchema,
  smtpSettingsSchema,
  storeSettingsSchema,
  stripeSettingsSchema,
  taxSettingsSchema,
  type BackupSettings,
  type CryptoSettings,
  type HomepageSettings,
  type LocalizationSettings,
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
  [SETTING_KEYS.backup]: BackupSettings;
  [SETTING_KEYS.localization]: LocalizationSettings;
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
  [SETTING_KEYS.backup]: backupSettingsSchema,
  [SETTING_KEYS.localization]: localizationSettingsSchema,
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
  const keys = Object.values(SETTING_KEYS);
  const entries = await Promise.all(
    keys.map(async (key) => [key, await getSetting(key)] as const),
  );
  return Object.fromEntries(entries) as {
    [K in SettingKey]: SettingsMap[K];
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
