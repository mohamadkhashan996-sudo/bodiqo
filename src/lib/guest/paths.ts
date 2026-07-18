/** Routes that require an authenticated session */
export const MEMBER_ONLY_PATH_PREFIXES = [
  "/messages",
  "/settings",
  "/notifications",
  "/calls",
  "/live/go",
  "/saved",
  "/onboarding",
  "/communities/new",
  "/admin",
] as const;

export function isMemberOnlyPath(pathname: string) {
  return MEMBER_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Block open redirects and protocol-relative / backslash tricks. */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/home",
) {
  if (!raw) return fallback;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!value.startsWith("/")) return fallback;
  if (
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("\\")
  ) {
    return fallback;
  }
  if (value.includes("://")) return fallback;
  if (value.startsWith("/sign-in") || value.startsWith("/sign-up")) {
    return fallback;
  }
  if (!/^\/[\w\-./?=&%#]*$/i.test(value)) return fallback;
  return value;
}
