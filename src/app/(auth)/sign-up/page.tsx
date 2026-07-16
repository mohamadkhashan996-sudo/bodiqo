"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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
      name: String(form.get("name") || "").trim(),
      handle: String(form.get("handle") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        setLoading(false);
        return;
      }
      router.push("/sign-in");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Join Cirqua
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Create your space. Handles are unique and can change later.
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <Field label="Name" name="name" required />
        <Field label="Handle" name="handle" required placeholder="@yourname" />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-[var(--cloud)] uppercase disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-[var(--signal)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        minLength={type === "password" ? 8 : undefined}
        className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)]"
      />
    </label>
  );
}
