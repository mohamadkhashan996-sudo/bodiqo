"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LinkAccountForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
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
        setHasPassword(Boolean(d.hasPassword));
        setReady(true);
      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "This link is no longer valid.",
        ),
      );
  }, [token]);

  const sessionMatches =
    status === "authenticated" &&
    Boolean(session?.user?.email) &&
    session?.user?.email?.toLowerCase() === email.toLowerCase();

  async function confirmLink(password?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...(password ? { password } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not link accounts.");
        setLoading(false);
        return;
      }

      if (password) {
        const pre = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await pre.json().catch(() => ({}));
        if (!pre.ok) {
          setError(
            loginData.error || "Accounts linked. Please sign in to continue.",
          );
          setLoading(false);
          router.push("/sign-in");
          return;
        }
        if (loginData.requires2fa) {
          setLoading(false);
          try {
            sessionStorage.setItem(
              "relune.2faChallenge",
              String(loginData.token),
            );
          } catch {
            /* ignore */
          }
          router.push(
            `/sign-in/2fa?callbackUrl=${encodeURIComponent("/settings#accounts")}`,
          );
          return;
        }
        const result = await signIn("challenge", {
          token: loginData.token,
          remember: "true",
          redirect: false,
        });
        if (result?.error) {
          setError("Accounts linked. Please sign in to continue.");
          setLoading(false);
          router.push("/sign-in");
          return;
        }
      }

      setLoading(false);
      router.push("/settings#accounts");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(
      new FormData(e.currentTarget).get("password") || "",
    );
    await confirmLink(password);
  }

  return (
    <PageTransition>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        Link your accounts
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        We found an existing Relune account with this email. Confirm ownership
        to securely connect {label || "this provider"} — we never create
        duplicate accounts.
      </p>

      {ready ? (
        <div className="mt-8 rounded-[1.75rem] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-5 backdrop-blur">
          <p className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
            Account
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{email}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Connect {label}</p>
        </div>
      ) : null}

      {ready && hasPassword ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
              Password
            </span>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="mt-2"
            />
          </label>
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[11px]"
          >
            {loading ? "Linking…" : "Confirm and link"}
          </Button>
        </form>
      ) : null}

      {ready && !hasPassword ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm leading-6 text-[var(--muted)]">
            This account uses social sign-in. Sign in with your existing method,
            then return here to confirm linking {label || "this provider"}.
          </p>
          {sessionMatches ? (
            <Button
              type="button"
              disabled={loading}
              className="w-full py-3.5 text-[11px]"
              onClick={() => void confirmLink()}
            >
              {loading ? "Linking…" : "Confirm and link"}
            </Button>
          ) : (
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(`/link-account?token=${token}`)}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--signal-deep)] px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-white uppercase shadow-[var(--shadow-sm)]"
            >
              Sign in to confirm
            </Link>
          )}
        </div>
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

export default function LinkAccountPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}
    >
      <LinkAccountForm />
    </Suspense>
  );
}
