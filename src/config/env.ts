import { z } from "zod";

const baseSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (url) =>
        url.startsWith("postgresql://") || url.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string (see .env.example)",
    ),
  AUTH_SECRET: z.string().min(16).optional(),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  MAIL_PROVIDER: z.enum(["log", "resend"]).optional(),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.string().optional(),
  MAINTENANCE_MODE: z.enum(["true", "false"]).optional(),
});

const productionSchema = baseSchema.extend({
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  MAIL_PROVIDER: z.literal("resend"),
  RESEND_API_KEY: z.string().min(1),
  REDIS_URL: z.string().url(),
  MAIL_FROM: z.string().min(3).optional(),
  METRICS_TOKEN: z.string().min(16).optional(),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  ALLOW_DEMO_SEEDS: z.enum(["true", "false"]).optional(),
  SMS_PROVIDER: z.enum(["log", "twilio"]).optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  TURN_URLS: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.ALLOW_DEMO_SEEDS === "true") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ALLOW_DEMO_SEEDS"],
      message: "ALLOW_DEMO_SEEDS must not be true in production",
    });
  }
  if (env.SMS_PROVIDER === "twilio") {
    for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} required when SMS_PROVIDER=twilio`,
        });
      }
    }
  }
  const hasVapidPub = Boolean(env.VAPID_PUBLIC_KEY);
  const hasVapidPriv = Boolean(env.VAPID_PRIVATE_KEY);
  if (hasVapidPub !== hasVapidPriv) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["VAPID_PUBLIC_KEY"],
      message: "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must both be set",
    });
  }
});

export type AppEnv = z.infer<typeof baseSchema>;

export function getEnv(): AppEnv {
  const schema =
    process.env.NODE_ENV === "production" ? productionSchema : baseSchema;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors;
    if (process.env.NODE_ENV === "production") {
      console.error("Production environment validation failed:", message);
      process.exit(1);
    }
    console.warn("Environment validation issues", message);
    return process.env as AppEnv;
  }
  return parsed.data;
}

/** Call once at process boot (server.ts). */
export function assertBootEnv() {
  getEnv();
}

export function socketAllowedOrigins(): string[] {
  const origins = new Set<string>();
  for (const value of [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null,
  ]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore */
    }
  }
  return [...origins];
}

export { site } from "./site";
