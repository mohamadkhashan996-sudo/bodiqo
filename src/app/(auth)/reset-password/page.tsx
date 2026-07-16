"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/motion/primitives";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") || "");
    const confirm = String(f.get("confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update password.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <PageTransition>
      <h1 className="page-title">Choose a new password</h1>
      <p className="page-subtitle mt-3">
        Set a fresh password, then sign in again.
      </p>
      {done ? (
        <div className="mt-8 space-y-4">
          <StateBanner tone="success">Password updated. You can now sign in.</StateBanner>
          <Link
            href="/sign-in"
            className="inline-block text-sm text-[var(--signal-deep)] hover:underline"
          >
            Continue to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          {!token ? (
            <StateBanner tone="error">
              Missing reset token. Open the link from your email.
            </StateBanner>
          ) : null}
          <Input
            required
            minLength={8}
            name="password"
            type="password"
            placeholder="New password"
            autoComplete="new-password"
          />
          <Input
            required
            minLength={8}
            name="confirm"
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
          />
          <p className="text-xs text-[var(--muted)]">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>
          {error ? <StateBanner tone="error">{error}</StateBanner> : null}
          <Button className="w-full" disabled={loading || !token}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </PageTransition>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
