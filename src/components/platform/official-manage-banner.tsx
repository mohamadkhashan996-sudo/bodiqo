"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function OfficialManageBanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function returnToAdmin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/official/return", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not return");
      const result = await signIn("challenge", {
        token: data.token,
        redirect: false,
      });
      if (result?.error) throw new Error("Return session failed");
      router.push(data.redirectTo || "/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-[var(--z-nav)] border-b-2 border-[var(--signal)] bg-[var(--ink)] px-3 py-2.5 text-[var(--cloud-elevated)] sm:px-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          You are managing the official Relune account.
        </p>
        <div className="flex items-center gap-3">
          {error ? (
            <span className="text-xs text-[var(--ember)]">{error}</span>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void returnToAdmin()}
            className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-white/20 disabled:opacity-60"
          >
            {busy ? "Returning…" : "Return to Super Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
