import { z } from "zod";

export const storeSettingsSchema = z.object({
  storeName: z.string().default("BODIQO"),
  storeTagline: z.string().default("Premium marketplace for everyday essentials"),
  supportEmail: z.string().email().or(z.literal("")).default(""),
  domain: z.string().default("localhost:3000"),
  logoUrl: z.string().default(""),
  faviconUrl: z.string().default(""),
  bannerUrl: z.string().default(""),
  language: z.enum(["en", "ar", "he"]).default("en"),
  currency: z.string().default("ILS"),
  currencySymbol: z.string().default("₪"),
  timezone: z.string().default("Asia/Jerusalem"),
  instagram: z.string().default(""),
  facebook: z.string().default(""),
  tiktok: z.string().default(""),
  whatsapp: z.string().default(""),
  youtube: z.string().default(""),
});

export const paypalSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["sandbox", "live"]).default("sandbox"),
  businessEmail: z.string().default(""),
  clientId: z.string().default(""),
  clientSecret: z.string().default(""),
  brandName: z.string().default("BODIQO"),
  connectedAt: z.string().default(""),
});

export const stripeSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["test", "live"]).default("test"),
  publishableKey: z.string().default(""),
  secretKey: z.string().default(""),
  webhookSecret: z.string().default(""),
  applePay: z.boolean().default(true),
  googlePay: z.boolean().default(true),
});

export const cryptoCoinSchema = z.object({
  coin: z.string(),
  network: z.string(),
  address: z.string(),
  enabled: z.boolean().default(true),
});

export const cryptoSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  wallets: z.array(cryptoCoinSchema).default([
    { coin: "BTC", network: "Bitcoin", address: "", enabled: false },
    { coin: "ETH", network: "Ethereum", address: "", enabled: false },
    { coin: "USDT", network: "TRC20", address: "", enabled: false },
    { coin: "USDT", network: "ERC20", address: "", enabled: false },
    { coin: "USDC", network: "ERC20", address: "", enabled: false },
    { coin: "SOL", network: "Solana", address: "", enabled: false },
    { coin: "BNB", network: "BEP20", address: "", enabled: false },
  ]),
});

export const taxSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  defaultRate: z.number().default(0),
  pricesIncludeTax: z.boolean().default(false),
});

export const smtpSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  host: z.string().default(""),
  port: z.number().int().default(587),
  secure: z.boolean().default(false),
  user: z.string().default(""),
  password: z.string().default(""),
  fromName: z.string().default("BODIQO"),
  fromEmail: z.string().default(""),
});

export const shippingSettingsSchema = z.object({
  flatRate: z.number().default(29.9),
  freeThreshold: z.number().default(250),
  estimatedDaysMin: z.number().int().default(3),
  estimatedDaysMax: z.number().int().default(7),
  countries: z.array(z.string()).default(["IL"]),
});

export const seoSettingsSchema = z.object({
  defaultTitle: z.string().default("BODIQO | Premium Marketplace"),
  defaultDescription: z
    .string()
    .default(
      "Shop electronics, home, fashion, beauty, sports, and more — curated premium products delivered worldwide.",
    ),
  ogImage: z.string().default(""),
  twitterHandle: z.string().default(""),
});

export const homepageSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["hero", "featured", "collections", "banner", "text"]),
  enabled: z.boolean().default(true),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  image: z.string().optional(),
  collectionSlug: z.string().optional(),
});

export const homepageSettingsSchema = z.object({
  heroHeadline: z.string().default("Shop everything. Beautifully."),
  heroSubheadline: z
    .string()
    .default(
      "A premium marketplace for electronics, home, fashion, beauty, sports, and everyday essentials.",
    ),
  heroCtaLabel: z.string().default("Shop collection"),
  heroCtaHref: z.string().default("/shop"),
  heroImageProductSlug: z.string().default(""),
  sections: z.array(homepageSectionSchema).default([]),
});

export const setupSettingsSchema = z.object({
  completedAt: z.string().default(""),
  version: z.number().int().default(1),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type PaypalSettings = z.infer<typeof paypalSettingsSchema>;
export type StripeSettings = z.infer<typeof stripeSettingsSchema>;
export type CryptoSettings = z.infer<typeof cryptoSettingsSchema>;
export type TaxSettings = z.infer<typeof taxSettingsSchema>;
export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>;
export type SetupSettings = z.infer<typeof setupSettingsSchema>;

export const SETTING_KEYS = {
  store: "store",
  paypal: "paypal",
  stripe: "stripe",
  crypto: "crypto",
  tax: "tax",
  smtp: "smtp",
  shipping: "shipping",
  seo: "seo",
  homepage: "homepage",
  setup: "setup",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const settingSchemas = {
  store: storeSettingsSchema,
  paypal: paypalSettingsSchema,
  stripe: stripeSettingsSchema,
  crypto: cryptoSettingsSchema,
  tax: taxSettingsSchema,
  smtp: smtpSettingsSchema,
  shipping: shippingSettingsSchema,
  seo: seoSettingsSchema,
  homepage: homepageSettingsSchema,
  setup: setupSettingsSchema,
} as const;
