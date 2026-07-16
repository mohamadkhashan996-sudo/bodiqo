"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthProviderButton } from "@/components/auth/provider-button";
import {
  OAUTH_PROVIDER_ORDER,
  PROVIDER_LABELS,
  type OAuthProviderId,
} from "@/modules/auth/providers";
import { PageTransition } from "@/components/motion/primitives";

type ProviderRow = {
  id: OAuthProviderId;
  enabled: boolean;
  configured: boolean;
  available: boolean;
};

const FRIENDLY_ERRORS: Record<string, string> = {
  CredentialsSignin: "Incorrect email or password.",
  OAuthAccountNotLinked:
    "This email is already used with another sign-in method. Link your accounts to continue.",
  OAuthCallback: "That sign-in didn’t complete. Please try again.",
  AccessDenied: "Access was denied for this sign-in method.",
  ProviderDisabled: "This sign-in method is currently unavailable.",
  EmailRequired: "That provider didn’t share an email address.",
  AccountUnavailable: "This account isn’t available right now.",
  AccountConflict: "This login doesn’t match your existing connection.",
  Configuration: "Sign-in isn’t fully configured yet. Please try email or contact support.",
  Default: "Something went wrong signing in. Please try again.",
};

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauth, setOauth] = useState<ProviderRow[]>([]);
  const [credentialsEnabled, setCredentialsEnabled] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [remember, setRemember] = useState(true);
  const [savedEmail, setSavedEmail] = useState("");

  useEffect(() => {
    const code = params.get("error");
    if (code) setError(FRIENDLY_ERRORS[code] || FRIENDLY_ERRORS.Default);
  }, [params]);

  useEffect(() => {
    try {
      const email = localStorage.getItem("relune.rememberEmail");
      if (email) {
        setSavedEmail(email);
        setRemember(true);
        setShowEmail(true);
      }
    } catch {
      /* ignore */
    }
    fetch("/api/auth/providers-config")
      .then((r) => r.json())
      .then((data) => {
        setOauth(data.oauth ?? []);
        setCredentialsEnabled(data.credentials !== false);
      })
      .catch(() => setOauth([]));
  }, []);

  const ordered = useMemo(() => {
    const map = new Map(oauth.map((p) => [p.id, p]));
    return OAUTH_PROVIDER_ORDER.map(
      (id) =>
        map.get(id) ?? {
          id,
          enabled: true,
          configured: false,
          available: false,
        },
    );
  }, [oauth]);

  async function onOAuth(id: OAuthProviderId, available: boolean) {
    setError(null);
    if (!available) {
      setError(
        `${PROVIDER_LABELS[id].replace("Continue with ", "")} sign-in isn’t configured on this server yet.`,
      );
      return;
    }
    await signIn(id, { callbackUrl: "/home" });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!credentialsEnabled) {
      setError("Email sign-in is currently unavailable.");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const result = await signIn("credentials", {
      email,
      password: String(form.get("password")),
      totpCode: String(form.get("totpCode") || ""),
      remember: remember ? "true" : "false",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError(FRIENDLY_ERRORS.CredentialsSignin);
      return;
    }
    try {
      if (remember) localStorage.setItem("relune.rememberEmail", email);
      else localStorage.removeItem("relune.rememberEmail");
    } catch {
      /* ignore */
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Welcome back
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Continue into Relune with a method you trust.
      </p>

      <div className="mt-10 space-y-3">
        {ordered.map((p) => (
          <AuthProviderButton
            key={p.id}
            id={p.id}
            label={PROVIDER_LABELS[p.id]}
            disabled={!p.enabled}
            hint={
              !p.enabled
                ? "Temporarily unavailable"
                : !p.configured
                  ? "Provider credentials not set"
                  : undefined
            }
            onClick={() => void onOAuth(p.id, p.available)}
          />
        ))}

        {credentialsEnabled ? (
          <AuthProviderButton
            id="credentials"
            label={PROVIDER_LABELS.credentials}
            onClick={() => setShowEmail((v) => !v)}
            hint={showEmail ? "Hide email form" : undefined}
          />
        ) : null}
      </div>

      {showEmail && credentialsEnabled ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-[1.75rem] border border-[var(--mist)] bg-[var(--glass)] p-5 backdrop-blur">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              defaultValue={savedEmail}
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)] dark:bg-white/5"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)] dark:bg-white/5"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Authenticator code (if enabled)
            </span>
            <input
              name="totpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)] dark:bg-white/5"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--signal)] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 space-y-4 border-t border-[var(--mist)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/forgot-password" className="text-[var(--signal-deep)] hover:underline">
            Forgot Password
          </Link>
          <Link href="/sign-up" className="font-medium text-[var(--ink)] hover:underline">
            Create New Account
          </Link>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 rounded border-[var(--mist)]"
          />
          Remember Me
        </label>
      </div>
    </PageTransition>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
