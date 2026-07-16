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
      totpCode: String(form.get("totpCode") || ""),
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
        <Field label="Authenticator code (if enabled)" name="totpCode" inputMode="numeric" />
        <div className="text-right"><Link href="/forgot-password" className="text-xs text-[var(--signal)] hover:underline">Forgot password?</Link></div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--signal)] px-6 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-white uppercase disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="my-7 flex items-center gap-3 text-[10px] tracking-[.15em] text-[var(--muted)] uppercase"><span className="h-px flex-1 bg-[var(--mist)]" />or continue with<span className="h-px flex-1 bg-[var(--mist)]" /></div>
      <div className="grid grid-cols-2 gap-2">{["google", "apple", "github", "microsoft-entra-id"].map((provider) => <button key={provider} onClick={() => signIn(provider, { callbackUrl: "/home" })} className="rounded-2xl border border-[var(--mist)] bg-white/50 px-3 py-3 text-xs font-semibold capitalize hover:bg-white">{provider.replace("-entra-id", "")}</button>)}</div>
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
  type = "text",
  required,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  inputMode?: "numeric";
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
        inputMode={inputMode}
        minLength={type === "password" ? 8 : undefined}
        className="mt-2 w-full rounded-2xl border border-[var(--mist)] bg-white/70 px-4 py-3 outline-none focus:border-[var(--signal)]"
      />
    </label>
  );
}
