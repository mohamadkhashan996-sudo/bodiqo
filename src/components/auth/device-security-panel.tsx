"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SessionRow = {
  id: string;
  deviceLabel?: string | null;
  ip?: string | null;
  lastActiveAt?: string | null;
  current?: boolean;
};

type DeviceRow = {
  id: string;
  label?: string | null;
};

type HistoryRow = {
  id: string;
  success: boolean;
  provider?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export function DeviceSecurityPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const [s, d, h] = await Promise.all([
      fetch("/api/auth/sessions").then((r) => r.json()),
      fetch("/api/auth/trusted-devices").then((r) => r.json()),
      fetch("/api/auth/login-history").then((r) => r.json()),
    ]);
    setSessions(s.sessions ?? []);
    setDevices(d.devices ?? []);
    setHistory(h.history ?? []);
  }

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  return (
    <div className="space-y-8">
      {msg ? <p className="text-sm text-[var(--signal-deep)]">{msg}</p> : null}

      <section>
        <h3 className="text-sm font-semibold">Active devices</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Revoke any session that isn’t yours.
        </p>
        {sessions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No active sessions.</p>
        ) : null}
        {sessions.map((s) => (
          <div
            key={s.id}
            className="mt-3 flex items-start justify-between gap-3 text-sm"
          >
            <div>
              <p>
                {s.deviceLabel ?? "Unknown device"}
                {s.current ? (
                  <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-[var(--signal-deep)]">
                    This device
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {[
                  s.ip,
                  s.lastActiveAt
                    ? `Active ${new Date(s.lastActiveAt).toLocaleString()}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {s.current ? (
              <span className="text-xs text-[var(--muted)]">Current</span>
            ) : (
              <button
                type="button"
                className="text-[var(--signal)]"
                onClick={async () => {
                  await fetch("/api/auth/sessions", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: s.id }),
                  });
                  setSessions((old) => old.filter((x) => x.id !== s.id));
                }}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </section>

      <section>
        <h3 className="text-sm font-semibold">Trusted devices</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Trusted devices skip new-login alerts.
        </p>
        {devices.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No trusted devices yet.</p>
        ) : null}
        {devices.map((d) => (
          <div key={d.id} className="mt-2 flex justify-between text-sm">
            <span>{d.label ?? "Trusted device"}</span>
            <button
              type="button"
              className="text-[var(--signal)]"
              onClick={async () => {
                await fetch("/api/auth/trusted-devices", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: d.id }),
                });
                setDevices((old) => old.filter((x) => x.id !== d.id));
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      <section>
        <h3 className="text-sm font-semibold">Login history</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Recent successful and failed sign-in attempts.
        </p>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {history.slice(0, 40).map((item) => (
            <p key={item.id} className="text-sm text-[var(--muted)]">
              <span
                className={
                  item.success ? "text-[var(--signal-deep)]" : "text-[var(--danger)]"
                }
              >
                {item.success ? "Success" : "Failed"}
              </span>
              {" · "}
              {item.provider ?? "credentials"}
              {item.ip ? ` · ${item.ip}` : ""}
              {" · "}
              {new Date(item.createdAt).toLocaleString()}
            </p>
          ))}
          {!history.length ? (
            <p className="text-sm text-[var(--muted)]">No login events yet.</p>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            await fetch("/api/auth/trusted-devices", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label: "This device" }),
            });
            setMsg("This device is now trusted.");
            await refresh();
          }}
        >
          Trust this device
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            await fetch("/api/auth/sessions", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ others: true }),
            });
            setSessions((old) => old.filter((s) => s.current));
            setMsg("Other devices were signed out.");
          }}
        >
          Log out other devices
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            await fetch("/api/auth/sessions", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ all: true }),
            });
            setSessions([]);
            await signOut({ callbackUrl: "/sign-in" });
          }}
        >
          Log out from all devices
        </Button>
      </div>
    </div>
  );
}

export function DeviceSecurityCard() {
  return (
    <Card id="sessions">
      <h2 className="font-[family-name:var(--font-display)] text-2xl">
        Devices & history
      </h2>
      <div className="mt-4">
        <DeviceSecurityPanel />
      </div>
    </Card>
  );
}
