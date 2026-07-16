import { z } from "zod";

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
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
