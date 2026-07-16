"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Welcome back
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Sign in to continue your Cirqua space.
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--signal)] px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-white uppercase disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        New here?{" "}
        <Link href="/sign-up" className="text-[var(--signal)] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={type === "password" ? 8 : undefined}
        className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)]"
      />
    </label>
  );
}
