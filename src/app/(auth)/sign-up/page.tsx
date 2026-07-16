"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { PageTransition } from "@/components/motion/primitives";
import { safeCallbackUrl } from "@/lib/guest/paths";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { AuthProviderButton } from "@/components/auth/provider-button";
import {
  OAUTH_PROVIDER_ORDER,
  PROVIDER_LABELS,
  type OAuthProviderId,
} from "@/modules/auth/providers";

type ProviderRow = {
  id: OAuthProviderId;
  enabled: boolean;
  configured: boolean;
  available: boolean;
};

function SignUpForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl") ?? params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [oauth, setOauth] = useState<ProviderRow[]>([]);

  useEffect(() => {
    fetch("/api/auth/providers-config")
      .then((r) => r.json())
      .then((data) => setOauth(data.oauth ?? []))
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

  const strength = useMemo(() => {
    const score =
      Number(password.length >= 8) +
      Number(/[A-Z]/.test(password)) +
      Number(/[a-z]/.test(password)) +
      Number(/[0-9]/.test(password)) +
      Number(/[^A-Za-z0-9]/.test(password));
    if (score <= 2) return { label: "Needs work", value: 34 };
    if (score <= 4) return { label: "Strong", value: 72 };
    return { label: "Excellent", value: 100 };
  }, [password]);

  async function onOAuth(id: OAuthProviderId, available: boolean) {
    setError(null);
    if (!available) {
      setError(
        `${PROVIDER_LABELS[id].replace("Continue with ", "")} isn’t configured on this server yet.`,
      );
      return;
    }
    await signIn(id, { callbackUrl });
  }

  async function resend() {
    if (!checkEmail) return;
    setResendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.verifyUrl) setDevVerifyUrl(data.verifyUrl);
      setResendState("sent");
    } catch {
      setResendState("idle");
      setError("Could not resend verification email.");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const passwordValue = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (passwordValue !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (
      passwordValue.length < 8 ||
      !/[A-Z]/.test(passwordValue) ||
      !/[a-z]/.test(passwordValue) ||
      !/[0-9]/.test(passwordValue)
    ) {
      setError("Password must include upper, lower, and a number (8+ characters).");
      setLoading(false);
      return;
    }
    const payload = {
      name: String(form.get("name") || "").trim(),
      handle: String(form.get("handle") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: passwordValue,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        setLoading(false);
        return;
      }
      setCheckEmail(payload.email);
      if (data.verifyUrl) setDevVerifyUrl(data.verifyUrl);
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <PageTransition>
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          We sent a verification link to <strong className="text-[var(--ink)]">{checkEmail}</strong>.
          Verify your address, then sign in.
        </p>
        {devVerifyUrl ? (
          <p className="mt-4 text-xs text-[var(--signal-deep)] break-all">
            Dev verify link:{" "}
            <Link href={devVerifyUrl} className="underline">
              {devVerifyUrl}
            </Link>
          </p>
        ) : null}
        <div className="mt-8 space-y-3">
          <Button
            type="button"
            variant="outline"
            disabled={resendState !== "idle"}
            onClick={() => void resend()}
            className="w-full"
          >
            {resendState === "sent"
              ? "Email resent"
              : resendState === "sending"
                ? "Sending…"
                : "Resend verification email"}
          </Button>
          <Link
            href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="block text-center text-sm text-[var(--signal-deep)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Join Relune
      </h1>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
        Create your free Relune account. You’ll verify your email before signing in.
      </p>

      <div className="mt-8 space-y-3">
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
      </div>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        <div className="h-px flex-1 bg-[var(--mist)]" />
        Or with email
        <div className="h-px flex-1 bg-[var(--mist)]" />
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Name" name="name" required autoComplete="name" />
        <Field label="Handle" name="handle" required placeholder="yourname" autoComplete="username" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          onChange={(value) => setPassword(value)}
        />
        <div className="rounded-[var(--radius-xl)] border border-[var(--mist)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            <span>Password strength</span>
            <span>{strength.label}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--mist)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--signal),var(--ember))] transition-all"
              style={{ width: `${strength.value}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>
        </div>
        <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
        {error ? <StateBanner tone="error">{error}</StateBanner> : null}
        <Button type="submit" disabled={loading} className="w-full py-3.5 text-[11px]">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-[var(--signal)] hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-xs text-[var(--muted)]">
        By joining you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </PageTransition>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <SignUpForm />
    </Suspense>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      <Input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={type === "password" ? 8 : undefined}
        className="mt-2"
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}
