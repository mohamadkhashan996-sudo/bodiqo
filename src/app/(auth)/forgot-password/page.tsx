"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";

import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: new FormData(e.currentTarget).get("email"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send reset email.");
        setLoading(false);
        return;
      }
      if (data.resetUrl) setDevResetUrl(data.resetUrl);
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <PageTransition>
      <h1 className="page-title">Reset your password</h1>
      <p className="page-subtitle mt-3">
        We’ll email a link to choose a new password.
      </p>
      {sent ? (
        <div className="mt-8 space-y-4">
          <StateBanner tone="success">
            If that email belongs to Relune, a reset link is on its way.
          </StateBanner>
          {devResetUrl ? (
            <p className="text-xs break-all text-[var(--signal-deep)]">
              Dev reset link:{" "}
              <Link href={devResetUrl} className="underline">
                {devResetUrl}
              </Link>
            </p>
          ) : null}
          <Link
            href="/sign-in"
            className="text-sm text-[var(--signal-deep)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input
            required
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {error ? <StateBanner tone="error">{error}</StateBanner> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <Link
            href="/sign-in"
            className="block text-center text-sm text-[var(--muted)] hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </PageTransition>
  );
}
