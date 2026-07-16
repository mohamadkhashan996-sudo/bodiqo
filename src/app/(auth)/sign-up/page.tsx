"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTransition } from "@/components/motion/primitives";
import { safeCallbackUrl } from "@/lib/guest/paths";

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl") ?? params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    const payload = {
      name: String(form.get("name") || "").trim(),
      handle: String(form.get("handle") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password,
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
      router.push(`/sign-in?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Join Relune
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Create your space with email. You’ll verify before your first sign-in.
        Password needs upper, lower, and a number.
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <Field label="Name" name="name" required autoComplete="name" />
        <Field
          label="Handle"
          name="handle"
          required
          placeholder="yourname"
          autoComplete="username"
        />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
        />
        {error ? (
          <p className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cloud)] disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={type === "password" ? 8 : undefined}
        className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)] dark:bg-white/5"
      />
    </label>
  );
}
