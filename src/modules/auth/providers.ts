export type OAuthProviderId = "google" | "apple" | "facebook" | "twitter";

export type AuthProviderFlags = Record<
  OAuthProviderId | "credentials",
  boolean
>;

export const DEFAULT_AUTH_PROVIDERS: AuthProviderFlags = {
  google: true,
  apple: true,
  facebook: true,
  twitter: true,
  credentials: true,
};

export const OAUTH_PROVIDER_ORDER = [
  "google",
  "apple",
  "facebook",
  "twitter",
] as const satisfies readonly OAuthProviderId[];

export const PROVIDER_LABELS: Record<OAuthProviderId | "credentials", string> =
  {
    google: "Continue with Google",
    apple: "Continue with Apple",
    facebook: "Continue with Facebook",
    twitter: "Continue with X",
    credentials: "Continue with Email",
  };

export const PROVIDER_SHORT: Record<OAuthProviderId | "credentials", string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
  twitter: "X",
  credentials: "Email",
};

/** Env vars required for a provider to be callable */
export function providerEnvReady(id: OAuthProviderId): boolean {
  switch (id) {
    case "google":
      return Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      );
    case "apple":
      return Boolean(
        process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET,
      );
    case "facebook":
      return Boolean(
        process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET,
      );
    case "twitter":
      return Boolean(
        (process.env.AUTH_TWITTER_ID || process.env.AUTH_X_ID) &&
        (process.env.AUTH_TWITTER_SECRET || process.env.AUTH_X_SECRET),
      );
    default:
      return false;
  }
}
