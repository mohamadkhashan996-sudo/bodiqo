"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTransition } from "@/components/motion/primitives";

function LinkAccountForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This account link is missing or incomplete.");
      return;
    }
    fetch(`/api/auth/link-account?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Invalid link");
        setEmail(d.email);
        setLabel(d.label || d.provider);
        setReady(true);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "This link is no longer valid."),
      );
  }, [token]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") || "");
    try {
      const res = await fetch("/api/auth/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not link accounts.");
        setLoading(false);
        return;
      }
      const result = await signIn("credentials", {
        email,
        password,
        remember: "true",
        redirect: false,
      });
      if (result?.error) {
        setError("Accounts linked. Please sign in to continue.");
        setLoading(false);
        router.push("/sign-in");
        return;
      }
      router.push("/settings#accounts");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Link your accounts
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        We found an existing Relune account with this email. Confirm your password to
        securely connect {label || "this provider"} — we never create duplicate accounts.
      </p>

      {ready ? (
        <div className="mt-8 rounded-[1.75rem] border border-[var(--mist)] bg-[var(--glass)] p-5 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Account
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{email}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Connect {label}</p>
        </div>
      ) : null}

      {ready ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            {loading ? "Linking…" : "Confirm and link"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p
          className="mt-5 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-8 text-sm text-[var(--muted)]">
        <Link href="/sign-in" className="text-[var(--signal-deep)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </PageTransition>
  );
}

export default function LinkAccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <LinkAccountForm />
    </Suspense>
  );
}
