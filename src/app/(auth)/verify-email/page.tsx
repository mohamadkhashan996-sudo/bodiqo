"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function VerifyInner() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying your email…");
  const [ok, setOk] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setMessage("Missing verification token.");
      setFailed(true);
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        setOk(r.ok);
        setFailed(!r.ok);
        setMessage(
          r.ok
            ? "Email verified. Welcome to Relune."
            : "That verification link is no longer valid.",
        );
      })
      .catch(() => {
        setFailed(true);
        setMessage("We couldn’t verify that link.");
      });
  }, [params]);

  async function resend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResendState("sending");
    setResendMsg(null);
    const email = String(new FormData(e.currentTarget).get("email") || "");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendState("sent");
      setResendMsg("If that email needs verification, a new link is on its way.");
    } catch {
      setResendState("idle");
      setResendMsg("Could not resend. Try again.");
    }
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        One last detail
      </h1>
      <p className="mt-6 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-5 text-sm">
        {message}
      </p>
      {ok ? (
        <Link
          href="/sign-in?verified=1"
          className="mt-6 inline-block text-sm text-[var(--signal-deep)] hover:underline"
        >
          Continue to sign in
        </Link>
      ) : null}
      {failed ? (
        <form onSubmit={resend} className="mt-8 space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Need a new link? Enter your email below.
          </p>
          <Input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
          <Button type="submit" disabled={resendState === "sending"} className="w-full">
            {resendState === "sent"
              ? "Email sent"
              : resendState === "sending"
                ? "Sending…"
                : "Resend verification"}
          </Button>
          {resendMsg ? (
            <p className="text-sm text-[var(--muted)]">{resendMsg}</p>
          ) : null}
          <Link href="/sign-in" className="block text-center text-sm text-[var(--signal-deep)] hover:underline">
            Back to sign in
          </Link>
        </form>
      ) : null}
    </PageTransition>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
