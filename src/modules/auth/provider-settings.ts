import { prisma } from "@/lib/prisma";
import { cacheDel, cached } from "@/lib/cache";
import {
  DEFAULT_AUTH_PROVIDERS,
  OAUTH_PROVIDER_ORDER,
  providerEnvReady,
  type AuthProviderFlags,
  type OAuthProviderId,
} from "@/modules/auth/providers";

const SETTINGS_KEY = "auth.providers";

export async function getAuthProviderFlags(): Promise<AuthProviderFlags> {
  return cached("auth:provider-flags", 30, async () => {
    const row = await prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row?.value || typeof row.value !== "object") return { ...DEFAULT_AUTH_PROVIDERS };
    return { ...DEFAULT_AUTH_PROVIDERS, ...(row.value as AuthProviderFlags) };
  });
}

export async function setAuthProviderFlags(
  actorId: string,
  flags: Partial<AuthProviderFlags>,
) {
  const current = await getAuthProviderFlags();
  const next = { ...current, ...flags };
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next, updatedBy: actorId },
    update: { value: next, updatedBy: actorId },
  });
  await cacheDel("auth:provider-flags");
  return next;
}

export async function isProviderEnabled(
  id: OAuthProviderId | "credentials",
): Promise<boolean> {
  const flags = await getAuthProviderFlags();
  return Boolean(flags[id]);
}

export async function getPublicAuthProviders() {
  const flags = await getAuthProviderFlags();
  return {
    credentials: flags.credentials,
    oauth: OAUTH_PROVIDER_ORDER.map((id) => ({
      id,
      enabled: flags[id],
      configured: providerEnvReady(id),
      available: flags[id] && providerEnvReady(id),
    })),
  };
}
