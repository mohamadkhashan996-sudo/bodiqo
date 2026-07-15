import { z } from "zod";

export const storeSettingsSchema = z.object({
  storeName: z.string().default("BODIQO"),
  storeTagline: z.string().default("Premium automotive accessories"),
  supportEmail: z.string().email().or(z.literal("")).default(""),
  domain: z.string().default("localhost:3000"),
  logoUrl: z.string().default(""),
  faviconUrl: z.string().default(""),
  language: z.enum(["en", "ar", "he"]).default("en"),
  currency: z.string().default("ILS"),
  currencySymbol: z.string().default("₪"),
  timezone: z.string().default("Asia/Jerusalem"),
});

export const paypalSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["sandbox", "live"]).default("sandbox"),
  clientId: z.string().default(""),
  clientSecret: z.string().default(""),
  brandName: z.string().default("BODIQO"),
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
  defaultTitle: z.string().default("BODIQO | Premium Automotive Accessories"),
  defaultDescription: z
    .string()
    .default(
      "Premium car accessories — dash cams, holders, chargers, and more.",
    ),
  ogImage: z.string().default(""),
  twitterHandle: z.string().default(""),
});

export const homepageSettingsSchema = z.object({
  heroHeadline: z.string().default("Drive with intention."),
  heroSubheadline: z
    .string()
    .default(
      "Premium car accessories engineered for modern vehicles — holders, dash cams, power, and care essentials.",
    ),
  heroCtaLabel: z.string().default("Shop collection"),
  heroCtaHref: z.string().default("/shop"),
  heroImageProductSlug: z.string().default(""),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type PaypalSettings = z.infer<typeof paypalSettingsSchema>;
export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>;

export const SETTING_KEYS = {
  store: "store",
  paypal: "paypal",
  smtp: "smtp",
  shipping: "shipping",
  seo: "seo",
  homepage: "homepage",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
