"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTransition } from "@/components/motion/primitives";

function TwoFactorForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing security challenge.");
      return;
    }
    fetch(`/api/auth/challenge?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Invalid challenge");
        setEmail(d.email);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Challenge expired."),
      );
  }, [token]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const totpCode = String(new FormData(e.currentTarget).get("totpCode") || "");
    const result = await signIn("challenge", {
      token,
      totpCode,
      remember: "true",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid authenticator or recovery code.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
        Confirm it’s you
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Enter an authenticator code or a recovery code
        {email ? ` for ${email}` : ""}.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Security code
          </span>
          <input
            name="totpCode"
            required
            autoComplete="one-time-code"
            className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)] dark:bg-white/5"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-full bg-[var(--signal)] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)] disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Continue"}
        </button>
      </form>
      {error ? (
        <p className="mt-5 text-sm text-[var(--danger)]" role="alert">
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

export default function TwoFactorChallengePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <TwoFactorForm />
    </Suspense>
  );
}
