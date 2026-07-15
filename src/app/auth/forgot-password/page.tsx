"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-32 pb-24 md:px-8">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-[var(--foreground)]">
        Forgot password
      </h1>
      <p className="mt-3 text-sm text-[var(--foreground)]/60">
        Enter your email and we&apos;ll send reset instructions if an account
        exists.
      </p>

      {sent ? (
        <p className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--foreground)]/80">
          If that email is registered, you&apos;ll receive a reset link shortly.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <label className="block">
            <span className="text-[11px] tracking-[0.18em] text-[var(--foreground)]/55 uppercase">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="submit"
            className="w-full bg-[var(--accent)] px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[var(--on-accent)] uppercase"
          >
            Send reset link
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-[var(--foreground)]/55">
        <Link href="/auth/sign-in" className="text-[var(--accent)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
