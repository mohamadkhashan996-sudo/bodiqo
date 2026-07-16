/** Routes that require an authenticated session */
export const MEMBER_ONLY_PATH_PREFIXES = [
  "/messages",
  "/settings",
  "/notifications",
  "/calls",
  "/onboarding",
  "/communities/new",
] as const;

export function isMemberOnlyPath(pathname: string) {
  return MEMBER_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function safeCallbackUrl(raw: string | null | undefined, fallback = "/home") {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.startsWith("/sign-in") || raw.startsWith("/sign-up")) return fallback;
  return raw;
}
