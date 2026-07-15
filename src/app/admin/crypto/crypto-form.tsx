"use client";

import { FormEvent, useState } from "react";
import type { CryptoSettings } from "@/lib/settings-schema";

export function CryptoSettingsForm({ initial }: { initial: CryptoSettings }) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "crypto", value: form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Save failed");
      return;
    }
    setForm(data.value);
    setMessage("Crypto settings saved.");
  }

  function updateWallet(
    index: number,
    field: "coin" | "network" | "address" | "enabled",
    value: string | boolean,
  ) {
    setForm((prev) => ({
      ...prev,
      wallets: prev.wallets.map((w, i) =>
        i === index ? { ...w, [field]: value } : w,
      ),
    }));
  }

  return (
    <form
      onSubmit={onSave}
      className="space-y-5 rounded-2xl border border-white/10 bg-[#121212] p-6"
    >
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) =>
            setForm((p) => ({ ...p, enabled: e.target.checked }))
          }
          className="accent-[#4a8cff]"
        />
        Enable crypto checkout
      </label>

      <div className="space-y-4">
        {form.wallets.map((wallet, index) => (
          <div
            key={`${wallet.coin}-${wallet.network}-${index}`}
            className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {wallet.coin} · {wallet.network}
              </p>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={wallet.enabled}
                  onChange={(e) =>
                    updateWallet(index, "enabled", e.target.checked)
                  }
                  className="accent-[#4a8cff]"
                />
                Enabled
              </label>
            </div>
            <input
              value={wallet.address}
              onChange={(e) => updateWallet(index, "address", e.target.value)}
              placeholder="Wallet address"
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#121212] px-4 py-3 text-sm outline-none focus:border-[#4a8cff]"
            />
          </div>
        ))}
      </div>

      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-[#4a8cff] px-6 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#0b0b0b] uppercase disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save wallets"}
      </button>
    </form>
  );
}
