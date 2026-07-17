import { getSetting } from "@/modules/admin/services/settings";

export type AuthSecurityPolicy = {
  maxLoginAttempts: number;
  sessionDays: number;
  lockoutMs: number;
};

export async function getAuthSecurityPolicy(): Promise<AuthSecurityPolicy> {
  const security =
    (await getSetting<{
      maxLoginAttempts?: number;
      sessionDays?: number;
      lockoutMinutes?: number;
    }>("security")) ?? {};

  const maxLoginAttempts = Math.min(
    50,
    Math.max(3, Number(security.maxLoginAttempts) || 8),
  );
  const sessionDays = Math.min(
    365,
    Math.max(1, Number(security.sessionDays) || 30),
  );
  const lockoutMinutes = Math.min(
    1440,
    Math.max(5, Number(security.lockoutMinutes) || 15),
  );

  return {
    maxLoginAttempts,
    sessionDays,
    lockoutMs: lockoutMinutes * 60_000,
  };
}
