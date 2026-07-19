"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function OpenOfficialAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openOfficial() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/official/open", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open official account");
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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void openOfficial()}
        className="rounded-full border-2 border-[var(--signal)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold tracking-wide text-[var(--ink)] uppercase disabled:opacity-60"
      >
        {busy ? "Opening…" : "Open Official Relune Account"}
      </button>
      {error ? (
        <p className="max-w-xs text-right text-[10px] text-[var(--ember)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
