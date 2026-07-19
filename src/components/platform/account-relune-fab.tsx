"use client";

import { useState } from "react";
import { SessionProvider, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Floating owner-only control. Mounted only after a server-side SUPER_ADMIN check
 * so it never appears in the DOM for other roles.
 */
function AccountReluneFabInner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openOfficial() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/official/open", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not open official account");
      }
      const result = await signIn("challenge", {
        token: data.token,
        redirect: false,
      });
      if (result?.error) throw new Error("Session switch failed");
      router.push(data.redirectTo || "/u/relune");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed end-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[calc(var(--z-toast)-1)] flex flex-col items-end gap-1 sm:end-6 sm:bottom-6 lg:bottom-8">
      {error ? (
        <p className="pointer-events-auto max-w-[14rem] rounded-lg border border-[var(--ember)]/40 bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--ember)] shadow-[var(--shadow-md)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void openOfficial()}
        aria-label="Account Relune — open official Relune account"
        className="pointer-events-auto rounded-full border-2 border-[var(--ink)] bg-[var(--signal)] px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase shadow-[var(--shadow-lg)] transition hover:brightness-105 disabled:opacity-60"
      >
        {busy ? "Opening…" : "Account Relune"}
      </button>
    </div>
  );
}

/** Client host with its own session provider so signIn works on all shells. */
export function AccountReluneHost() {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <AccountReluneFabInner />
    </SessionProvider>
  );
}
