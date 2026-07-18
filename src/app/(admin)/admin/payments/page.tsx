"use client";

import { useState } from "react";

import {
  AdminPageHeader,
  adminPost,
  Panel,
  StatCard,
  useAdminJson,
} from "@/components/admin/admin-ui";

type Payments = {
  summary: {
    giftCoins30d: number;
    giftEvents30d: number;
    giftCoinsLifetime: number;
    giftEventsLifetime: number;
  };
  recentGifts: Array<{
    id: string;
    coinCost: number;
    createdAt: string;
    gift: { name: string };
    sender: { handle: string | null };
    host: { handle: string | null };
    session: { title: string };
  }>;
  topWallets: Array<{
    userId: string;
    coins: number;
    user: { handle: string | null; email: string };
  }>;
  catalog: Array<{
    id: string;
    name: string;
    emoji: string;
    coinCost: number;
    isActive: boolean;
  }>;
  note: string;
};

export default function AdminPaymentsPage() {
  const { data, loading, error, reload } = useAdminJson<Payments>(
    "/api/admin/payments",
  );
  const [userId, setUserId] = useState("");
  const [delta, setDelta] = useState("100");
  const [reason, setReason] = useState("Support adjustment");
  const [msg, setMsg] = useState<string | null>(null);

  async function adjust() {
    await adminPost("/api/admin/payments", {
      action: "adjust_wallet",
      userId: userId.trim(),
      delta: Number(delta),
      reason,
    });
    setMsg("Wallet adjusted");
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        subtitle="Live gift coins and wallets — current Relune monetization only."
      />
      {msg ? <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      {data ? (
        <>
          <p className="mb-4 text-sm text-[var(--muted)]">{data.note}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Gift coins (30d)" value={data.summary.giftCoins30d} />
            <StatCard label="Gifts (30d)" value={data.summary.giftEvents30d} />
            <StatCard
              label="Lifetime gift coins"
              value={data.summary.giftCoinsLifetime}
            />
            <StatCard
              label="Lifetime gifts"
              value={data.summary.giftEventsLifetime}
            />
          </div>

          <Panel className="mt-6 space-y-3">
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
              Adjust wallet
            </h2>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User id"
              className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
            />
            <input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="Delta (+/-)"
              className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason"
              className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--cloud)]"
              onClick={() => void adjust().catch((e) => setMsg(String(e)))}
            >
              Apply adjustment
            </button>
          </Panel>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Recent gifts
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.recentGifts.map((g) => (
                  <li key={g.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {g.gift.name} · @{g.sender.handle} → @{g.host.handle}
                    </span>
                    <span className="shrink-0">{g.coinCost}</span>
                  </li>
                ))}
                {!data.recentGifts.length ? (
                  <li className="text-[var(--muted)]">No gifts yet</li>
                ) : null}
              </ul>
            </Panel>
            <Panel>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Top wallets
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.topWallets.map((w) => (
                  <li key={w.userId} className="flex justify-between gap-3">
                    <span className="truncate">
                      @{w.user.handle || w.userId}
                    </span>
                    <span className="shrink-0">{w.coins} coins</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel className="lg:col-span-2">
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                Gift catalog
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.catalog.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>
                      {g.emoji} {g.name} · {g.coinCost} coins
                    </span>
                    <button
                      type="button"
                      className="rounded-full border px-3 py-1 text-xs"
                      onClick={() =>
                        void adminPost("/api/admin/payments", {
                          action: "catalog_active",
                          giftId: g.id,
                          active: !g.isActive,
                        }).then(reload)
                      }
                    >
                      {g.isActive ? "Disable" : "Enable"}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
