"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageTransition } from "@/components/motion/primitives";

function VerifyInner() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying your email…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setMessage("Missing verification token.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        setOk(r.ok);
        setMessage(
          r.ok
            ? "Email verified. Welcome to Relune."
            : "That verification link is no longer valid.",
        );
      })
      .catch(() => setMessage("We couldn’t verify that link."));
  }, [params]);

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        One last detail
      </h1>
      <p className="mt-6 rounded-2xl border border-[var(--mist)] bg-[var(--glass)] p-5 text-sm">
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
