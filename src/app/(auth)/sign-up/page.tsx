"use client";

import { Suspense, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

import { AuthProviderButton } from "@/components/auth/provider-button";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { safeCallbackUrl } from "@/lib/guest/paths";
import { isValidE164 } from "@/lib/phone";
type Mode = "main" | "email" | "phone";

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(
    params.get("callbackUrl") ?? params.get("next"),
  );
  const [mode, setMode] = useState<Mode>("main");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [phoneHandle, setPhoneHandle] = useState("");
  const [phoneStep, setPhoneStep] = useState<"details" | "code">("details");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneDebugCode, setPhoneDebugCode] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
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

  async function sendPhoneRegisterCode(e: FormEvent) {
    e.preventDefault();
    if (!phoneName.trim() || phoneName.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    if (
      !/^[a-z0-9_.]{3,24}$/.test(
        phoneHandle.trim().toLowerCase().replace(/^@+/, ""),
      )
    ) {
      setError("Handle must be 3–24 characters (letters, numbers, _, .).");
      return;
    }
    if (!isValidE164(phone)) {
      setError("Enter a valid phone number for the selected country.");
      return;
    }
    setLoading(true);
    setError(null);
    setPhoneDebugCode(null);
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: "REGISTER" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not send code.");
      return;
    }
    if (data.debugCode) setPhoneDebugCode(data.debugCode);
    setPhoneStep("code");
  }

  async function completePhoneRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/phone/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: phoneName.trim(),
        handle: phoneHandle.trim().toLowerCase().replace(/^@+/, ""),
        phone,
        code: phoneCode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Could not create account.");
      return;
    }
    const result = await signIn("challenge", {
      token: data.token,
      remember: "true",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Account created. Please sign in with your phone.");
      router.push("/sign-in");
      return;
    }
    router.push(callbackUrl || "/onboarding");
    router.refresh();
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
      setError(
        "Password must include upper, lower, and a number (8+ characters).",
      );
      setLoading(false);
      return;
    }
    const payload = {
      name: String(form.get("name") || "").trim(),
      handle: String(form.get("handle") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: passwordValue,
      website: String(form.get("website") || ""),
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
          We sent a verification link to{" "}
          <strong className="text-[var(--ink)]">{checkEmail}</strong>. Verify
          your address, then sign in.
        </p>
        {devVerifyUrl ? (
          <p className="mt-4 text-xs break-all text-[var(--signal-deep)]">
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
        Create your free Relune account. You’ll verify your email before signing
        in.
      </p>

      {mode === "main" ? (
        <>
          <div className="mt-8 space-y-3">
            <AuthProviderButton
              id="email"
              label="Continue with Email"
              onClick={() => {
                setError(null);
                setMode("email");
              }}
            />
            <AuthProviderButton
              id="phone"
              label="Continue with Phone"
              onClick={() => {
                setError(null);
                setMode("phone");
              }}
            />
          </div>
          {error ? (
            <div className="mt-4">
              <StateBanner tone="error">{error}</StateBanner>
            </div>
          ) : null}
        </>
      ) : null}

      {mode === "email" ? (
        <div className="form-panel mt-8 space-y-4">
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:underline"
            onClick={() => setMode("main")}
          >
            ← All sign-up methods
          </button>
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Name" name="name" required autoComplete="name" />
            <Field
              label="Handle"
              name="handle"
              required
              placeholder="yourname"
              autoComplete="username"
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              onChange={(value) => setPassword(value)}
            />
            <div className="rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
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
                Use at least 8 characters with uppercase, lowercase, and a
                number.
              </p>
            </div>
            <Field
              label="Confirm password"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
            />
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            {error ? <StateBanner tone="error">{error}</StateBanner> : null}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-[11px]"
            >
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
        </div>
      ) : null}

      {mode === "phone" ? (
        <div className="form-panel mt-8 space-y-4">
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:underline"
            onClick={() => {
              setMode("main");
              setPhone("");
              setPhoneName("");
              setPhoneHandle("");
              setPhoneStep("details");
              setPhoneCode("");
              setPhoneDebugCode(null);
              setError(null);
            }}
          >
            ← All sign-up methods
          </button>
          {phoneStep === "details" ? (
            <form onSubmit={sendPhoneRegisterCode} className="space-y-4">
              <label className="block">
                <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                  Name
                </span>
                <Input
                  value={phoneName}
                  onChange={(e) => setPhoneName(e.target.value)}
                  required
                  minLength={2}
                  autoFocus
                  className="mt-2"
                />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                  Handle
                </span>
                <Input
                  value={phoneHandle}
                  onChange={(e) => setPhoneHandle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={24}
                  placeholder="yourname"
                  className="mt-2"
                />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                  Phone number
                </span>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                  className="mt-2"
                />
              </label>
              <p className="text-sm leading-6 text-[var(--muted)]">
                We&apos;ll text you a one-time code to verify your number.
              </p>
              {error ? <StateBanner tone="error">{error}</StateBanner> : null}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-[11px]"
              >
                {loading ? "Sending…" : "Send verification code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={completePhoneRegister} className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Enter the code sent to {phone}.
              </p>
              {phoneDebugCode ? (
                <p className="text-xs text-[var(--signal-deep)]">
                  Dev code: {phoneDebugCode}
                </p>
              ) : null}
              <label className="block">
                <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                  Verification code
                </span>
                <Input
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  className="mt-2"
                />
              </label>
              {error ? <StateBanner tone="error">{error}</StateBanner> : null}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-[11px]"
              >
                {loading ? "Creating…" : "Create account"}
              </Button>
              <button
                type="button"
                className="text-xs text-[var(--muted)] hover:underline"
                onClick={() => {
                  setPhoneStep("details");
                  setPhoneCode("");
                  setError(null);
                }}
              >
                Change phone number
              </button>
            </form>
          )}
        </div>
      ) : null}

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
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}
    >
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
      <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
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
