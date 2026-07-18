"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { safeCallbackUrl } from "@/lib/guest/paths";

function TwoFactorForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const callbackUrl = safeCallbackUrl(
    params.get("callbackUrl") ?? params.get("next"),
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let challenge = "";
    try {
      challenge = sessionStorage.getItem("relune.2faChallenge") || "";
    } catch {
      challenge = "";
    }
    // Legacy query param fallback (cleared after read).
    const fromQuery = params.get("token") || "";
    challenge = challenge || fromQuery;
    if (fromQuery) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    if (!challenge) {
      setError("Missing security challenge.");
      return;
    }
    setToken(challenge);
    fetch(`/api/auth/challenge?token=${encodeURIComponent(challenge)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Invalid challenge");
        setEmail(d.email);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Challenge expired."),
      );
  }, [params]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const totpCode = String(
      new FormData(e.currentTarget).get("totpCode") || "",
    );
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
    try {
      sessionStorage.removeItem("relune.2faChallenge");
    } catch {
      /* ignore */
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
        Confirm it’s you
      </h1>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
        Enter an authenticator code or a recovery code
        {email ? ` for ${email}` : ""}.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
            Security code
          </span>
          <Input
            name="totpCode"
            required
            autoComplete="one-time-code"
            className="mt-2"
          />
        </label>
        <Button
          type="submit"
          variant="signal"
          disabled={loading || !token}
          className="w-full py-3.5 text-[11px]"
        >
          {loading ? "Verifying…" : "Continue"}
        </Button>
      </form>
      {error ? (
        <div className="mt-5">
          <StateBanner tone="error">{error}</StateBanner>
        </div>
      ) : null}
      <p className="mt-8 text-sm text-[var(--muted)]">
        <Link
          href="/sign-in"
          className="text-[var(--signal-deep)] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </PageTransition>
  );
}

export default function TwoFactorChallengePage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}
    >
      <TwoFactorForm />
    </Suspense>
  );
}
