"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      router.push("/auth/sign-in");
      return;
    }
    router.push("/shop");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-32 pb-24 md:px-8">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Create account
      </h1>
      <p className="mt-3 text-sm text-[#f3efe6]/60">
        Join BODIQO for a refined shopping experience.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-[#f3efe6]/55 uppercase">
            Name
          </span>
          <input
            name="name"
            required
            minLength={2}
            className="mt-2 w-full border border-white/15 bg-transparent px-4 py-3 text-[#f3efe6] outline-none focus:border-[#d4b483]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-[#f3efe6]/55 uppercase">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            className="mt-2 w-full border border-white/15 bg-transparent px-4 py-3 text-[#f3efe6] outline-none focus:border-[#d4b483]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-[#f3efe6]/55 uppercase">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-2 w-full border border-white/15 bg-transparent px-4 py-3 text-[#f3efe6] outline-none focus:border-[#d4b483]"
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#d4b483] px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[#0b0b0b] uppercase disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[#f3efe6]/55">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-[#d4b483] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
