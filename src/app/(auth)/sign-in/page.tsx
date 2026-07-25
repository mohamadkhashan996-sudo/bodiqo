"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

import { AuthProviderButton } from "@/components/auth/provider-button";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { safeCallbackUrl } from "@/lib/guest/paths";
import { isValidE164 } from "@/lib/phone";
const FRIENDLY_ERRORS: Record<string, string> = {
  CredentialsSignin: "Incorrect email, password, or security code.",
  AccessDenied: "Access was denied for this sign-in method.",
  AccountUnavailable: "This account isn’t available right now.",
  Configuration:
    "Sign-in isn’t fully configured yet. Please try email or contact support.",
  Default: "Something went wrong signing in. Please try again.",
};

type Mode = "methods" | "email" | "phone";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(
    params.get("callbackUrl") ?? params.get("next"),
  );
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("methods");
  const [remember, setRemember] = useState(true);
  const [savedEmail, setSavedEmail] = useState("");
  const [phoneStep, setPhoneStep] = useState<"request" | "code">("request");
  const [phone, setPhone] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("error");
    if (code) {
      setError(FRIENDLY_ERRORS[code] ?? FRIENDLY_ERRORS.Default ?? null);
    }
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
  }, []);

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
      if (
        data.code === "EMAIL_NOT_VERIFIED" ||
        data.error === "EMAIL_NOT_VERIFIED"
      ) {
        setUnverifiedEmail(email);
        setError(
          data.error && data.error !== "EMAIL_NOT_VERIFIED"
            ? data.error
            : "Verify your email before signing in.",
        );
        return;
      }
      setError(data.error || FRIENDLY_ERRORS.CredentialsSignin);
      return;
    }

    if (data.requires2fa) {
      setLoading(false);
      try {
        sessionStorage.setItem("relune.2faChallenge", String(data.token));
      } catch {
        /* ignore */
      }
      router.push(
        `/sign-in/2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`,
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
      setError(FRIENDLY_ERRORS.CredentialsSignin ?? null);
      return;
    }
    try {
      if (remember) localStorage.setItem("relune.rememberEmail", email);
      else localStorage.removeItem("relune.rememberEmail");
    } catch {
      /* ignore */
    }
    window.location.assign(callbackUrl);
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
      try {
        sessionStorage.setItem("relune.2faChallenge", String(data.token));
      } catch {
        /* ignore */
      }
      router.push(
        `/sign-in/2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`,
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
    window.location.assign(callbackUrl);
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
        <div className="mt-5">
          <StateBanner tone="success">
            Email verified. You can sign in now.
          </StateBanner>
        </div>
      ) : null}

      {mode === "methods" ? (
        <div className="mt-10 space-y-3">
          <AuthProviderButton
            id="email"
            label="Continue with Email"
            onClick={() => setMode("email")}
          />
          <AuthProviderButton
            id="phone"
            label="Continue with Phone"
            onClick={() => setMode("phone")}
          />
        </div>
      ) : null}

      {mode === "email" ? (
        <form onSubmit={onEmailSubmit} className="form-panel mt-8 space-y-4">
          <button
            type="button"
            className="text-xs font-medium text-[var(--muted-strong)] underline-offset-4 hover:underline"
            onClick={() => setMode("methods")}
          >
            ← All sign-in methods
          </button>
          <Field label="Email" htmlFor="sign-in-email">
            <Input
              id="sign-in-email"
              name="email"
              type="email"
              required
              defaultValue={savedEmail}
              autoComplete="email"
            />
          </Field>
          <Field label="Password" htmlFor="sign-in-password">
            <Input
              id="sign-in-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" variant="signal" fullWidth disabled={loading}>
            {loading ? "Signing in…" : "Sign in with email"}
          </Button>
        </form>
      ) : null}

      {mode === "phone" ? (
        <div className="form-panel mt-8 space-y-4">
          <button
            type="button"
            className="text-xs font-medium text-[var(--muted-strong)] underline-offset-4 hover:underline"
            onClick={() => {
              setMode("methods");
              setPhoneStep("request");
            }}
          >
            ← All sign-in methods
          </button>
          {phoneStep === "request" ? (
            <form onSubmit={sendPhoneCode} className="space-y-4">
              <Field label="Phone number" htmlFor="sign-in-phone">
                <PhoneInput
                  id="sign-in-phone"
                  name="phone"
                  value={phone}
                  onChange={setPhone}
                  required
                />
              </Field>
              <Button
                type="submit"
                variant="signal"
                fullWidth
                disabled={loading || !isValidE164(phone)}
              >
                {loading ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyPhone} className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Code sent to {phone}
              </p>
              {debugCode ? (
                <p className="text-xs text-[var(--signal-deep)]">
                  Dev code: {debugCode}
                </p>
              ) : null}
              <Field label="SMS code" htmlFor="sign-in-code">
                <Input
                  id="sign-in-code"
                  name="code"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Field>
              <Button
                type="submit"
                variant="signal"
                fullWidth
                disabled={loading}
              >
                {loading ? "Verifying…" : "Verify and sign in"}
              </Button>
            </form>
          )}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5" role="alert">
          <StateBanner tone="error">{error}</StateBanner>
          {unverifiedEmail ? (
            <button
              type="button"
              disabled={resendState !== "idle"}
              onClick={() => void resendVerification()}
              className="mt-3 text-sm font-medium text-[var(--signal-deep)] underline-offset-4 hover:underline disabled:opacity-60"
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

      <div className="mt-8 space-y-4 border-t-2 border-[var(--mist-strong)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/forgot-password"
            className="text-[var(--signal-deep)] hover:underline"
          >
            Forgot Password
          </Link>
          <Link
            href="/sign-up"
            className="font-medium text-[var(--ink)] hover:underline"
          >
            Create New Account
          </Link>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 rounded border-2 border-[var(--mist-strong)] accent-[var(--signal-deep)]"
          />
          Remember Me
        </label>
      </div>
    </PageTransition>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          <div className="skeleton h-10 w-48" />
          <div className="skeleton h-12 w-full rounded-full" />
          <div className="skeleton h-12 w-full rounded-full" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
