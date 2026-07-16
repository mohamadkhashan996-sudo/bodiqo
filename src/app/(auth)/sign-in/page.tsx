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
import { safeCallbackUrl } from "@/lib/guest/paths";

type ProviderRow = {
  id: OAuthProviderId;
  enabled: boolean;
  configured: boolean;
  available: boolean;
};

const FRIENDLY_ERRORS: Record<string, string> = {
  CredentialsSignin: "Incorrect email, password, or security code.",
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

type Mode = "oauth" | "email" | "phone";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl") ?? params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [loading, setLoading] = useState(false);
  const [oauth, setOauth] = useState<ProviderRow[]>([]);
  const [credentialsEnabled, setCredentialsEnabled] = useState(true);
  const [mode, setMode] = useState<Mode>("oauth");
  const [remember, setRemember] = useState(true);
  const [savedEmail, setSavedEmail] = useState("");
  const [phoneStep, setPhoneStep] = useState<"request" | "code">("request");
  const [phone, setPhone] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("error");
    if (code) setError(FRIENDLY_ERRORS[code] || FRIENDLY_ERRORS.Default);
    if (params.get("verified") === "1") {
      setError(null);
    }
  }, [params]);

  useEffect(() => {
    try {
      const email = localStorage.getItem("relune.rememberEmail");
      if (email) {
        setSavedEmail(email);
        setRemember(true);
        setMode("email");
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
    setUnverifiedEmail(null);
    if (!available) {
      setError(
        `${PROVIDER_LABELS[id].replace("Continue with ", "")} sign-in isn’t configured on this server yet.`,
      );
      return;
    }
    await signIn(id, { callbackUrl });
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    setResendState("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setResendState("sent");
    } catch {
      setResendState("idle");
      setError("Could not resend verification email.");
    }
  }

  async function onEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!credentialsEnabled) {
      setError("Email sign-in is currently unavailable.");
      return;
    }
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);
    setResendState("idle");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const pre = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await pre.json().catch(() => ({}));
    if (!pre.ok) {
      setLoading(false);
      if (data.error === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
        setError("Verify your email before signing in.");
        return;
      }
      setError(data.error || FRIENDLY_ERRORS.CredentialsSignin);
      return;
    }

    if (data.requires2fa) {
      setLoading(false);
      router.push(
        `/sign-in/2fa?token=${encodeURIComponent(data.token)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
      return;
    }

    const result = await signIn("challenge", {
      token: data.token,
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
    router.push(callbackUrl);
    router.refresh();
  }

  async function sendPhoneCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugCode(null);
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: "LOGIN" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not send code.");
      return;
    }
    if (data.debugCode) setDebugCode(data.debugCode);
    setPhoneStep("code");
  }

  async function verifyPhone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") || "");
    const res = await fetch("/api/auth/phone/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Invalid code.");
      return;
    }
    if (data.requires2fa) {
      router.push(
        `/sign-in/2fa?token=${encodeURIComponent(data.token)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
      return;
    }
    const result = await signIn("challenge", {
      token: data.token,
      remember: remember ? "true" : "false",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Could not complete phone sign-in.");
      return;
    }
    router.push(callbackUrl);
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

      {params.get("verified") === "1" ? (
        <p className="mt-5 rounded-2xl border border-[var(--signal)]/30 bg-[var(--signal)]/10 px-4 py-3 text-sm text-[var(--signal-deep)]">
          Email verified. You can sign in now.
        </p>
      ) : null}

      {mode === "oauth" ? (
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
            <>
              <AuthProviderButton
                id="credentials"
                label={PROVIDER_LABELS.credentials}
                onClick={() => setMode("email")}
              />
              <AuthProviderButton
                id="credentials"
                label="Continue with Phone"
                onClick={() => setMode("phone")}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {mode === "email" && credentialsEnabled ? (
        <form
          onSubmit={onEmailSubmit}
          className="mt-8 space-y-4 rounded-[1.75rem] border border-[var(--mist)] bg-[var(--glass)] p-5 backdrop-blur"
        >
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:underline"
            onClick={() => setMode("oauth")}
          >
            ← All sign-in methods
          </button>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--signal)] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>
      ) : null}

      {mode === "phone" ? (
        <div className="mt-8 space-y-4 rounded-[1.75rem] border border-[var(--mist)] bg-[var(--glass)] p-5 backdrop-blur">
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:underline"
            onClick={() => {
              setMode("oauth");
              setPhoneStep("request");
            }}
          >
            ← All sign-in methods
          </button>
          {phoneStep === "request" ? (
            <form onSubmit={sendPhoneCode} className="space-y-4">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Phone (E.164)
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+15551234567"
                  className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)] dark:bg-white/5"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--signal)] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)] disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyPhone} className="space-y-4">
              <p className="text-sm text-[var(--muted)]">Code sent to {phone}</p>
              {debugCode ? (
                <p className="text-xs text-[var(--signal-deep)]">Dev code: {debugCode}</p>
              ) : null}
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  SMS code
                </span>
                <input
                  name="code"
                  required
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
                {loading ? "Verifying…" : "Verify and sign in"}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-5 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          <p>{error}</p>
          {unverifiedEmail ? (
            <button
              type="button"
              disabled={resendState !== "idle"}
              onClick={() => void resendVerification()}
              className="mt-2 text-[var(--signal-deep)] underline disabled:opacity-60"
            >
              {resendState === "sent"
                ? "Verification email sent"
                : resendState === "sending"
                  ? "Sending…"
                  : "Resend verification email"}
            </button>
          ) : null}
        </div>
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
