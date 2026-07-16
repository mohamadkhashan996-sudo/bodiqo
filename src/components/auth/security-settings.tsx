"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function SecuritySettings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [remainingCodes, setRemainingCodes] = useState(0);
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");

  async function refresh() {
    const d = await fetch("/api/auth/2fa/recovery").then((r) => r.json());
    setTwoFactorEnabled(Boolean(d.enabled));
    setRemainingCodes(d.remaining ?? 0);
    const p = await fetch("/api/auth/phone").then((r) => r.json());
    setPhone(p.phone ?? "");
    setPhoneVerified(Boolean(p.phoneVerified));
  }

  useEffect(() => {
    void refresh().catch(() => {});
  }, []);

  async function setup2fa() {
    setMsg(null);
    const res = await fetch("/api/auth/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Could not start 2FA setup");
      return;
    }
    setSecret(d.secret ?? "");
    setOtpauthUrl(d.otpauthUrl ?? "");
  }

  async function enable2fa() {
    setMsg(null);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Invalid code");
      return;
    }
    setRecoveryCodes(d.recoveryCodes ?? []);
    setSecret("");
    setOtpauthUrl("");
    setCode("");
    setMsg("2FA enabled. Save your recovery codes now — they won’t be shown again.");
    await refresh();
  }

  async function disable2fa() {
    setMsg(null);
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Could not disable 2FA");
      return;
    }
    setMsg("2FA disabled.");
    setCode("");
    await refresh();
  }

  async function regenerateCodes() {
    setMsg(null);
    const res = await fetch("/api/auth/2fa/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Could not regenerate codes");
      return;
    }
    setRecoveryCodes(d.recoveryCodes ?? []);
    setMsg("New recovery codes generated.");
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Security</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Password, phone verification, two-factor authentication, and recovery codes.
        </p>
        {msg ? <p className="mt-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}
      </div>

      <section>
        <h3 className="text-sm font-semibold">Password</h3>
        <div className="mt-3 space-y-2">
          <input
            type="password"
            placeholder="Current password (if set)"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            className="w-full rounded-xl border border-[var(--mist)] bg-white px-3 py-2 text-sm dark:bg-[var(--night-elevated)]"
          />
          <input
            type="password"
            placeholder="New password"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            className="w-full rounded-xl border border-[var(--mist)] bg-white px-3 py-2 text-sm dark:bg-[var(--night-elevated)]"
          />
          <Button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/auth/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  currentPassword: pwCurrent || undefined,
                  newPassword: pwNew,
                }),
              });
              const d = await res.json();
              setMsg(res.ok ? "Password updated. Other sessions were signed out." : d.error);
              if (res.ok) {
                setPwCurrent("");
                setPwNew("");
              }
            }}
          >
            Update password
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Phone</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {phone
            ? `${phone} · ${phoneVerified ? "Verified" : "Pending verification"}`
            : "No phone linked"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="+15551234567"
            className="rounded-xl border border-[var(--mist)] bg-white px-3 py-2 text-sm dark:bg-[var(--night-elevated)]"
          />
          <Button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/auth/phone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: phoneInput }),
              });
              const d = await res.json();
              if (!res.ok) {
                setMsg(d.error);
                return;
              }
              setDebugCode(d.debugCode ?? null);
              setMsg("Verification code sent.");
            }}
          >
            Send code
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
            placeholder="SMS code"
            className="rounded-xl border border-[var(--mist)] bg-white px-3 py-2 text-sm dark:bg-[var(--night-elevated)]"
          />
          <Button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/auth/phone", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: phoneInput || phone, code: phoneCode }),
              });
              const d = await res.json();
              setMsg(res.ok ? "Phone verified." : d.error);
              if (res.ok) await refresh();
            }}
          >
            Verify phone
          </Button>
          {phone ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await fetch("/api/auth/phone", { method: "DELETE" });
                setMsg("Phone removed.");
                await refresh();
              }}
            >
              Remove phone
            </Button>
          ) : null}
        </div>
        {debugCode ? (
          <p className="mt-2 text-xs text-[var(--signal-deep)]">Dev code: {debugCode}</p>
        ) : null}
      </section>

      <section>
        <h3 className="text-sm font-semibold">Two-factor authentication</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Status: {twoFactorEnabled ? "Enabled" : "Off"}
          {twoFactorEnabled ? ` · ${remainingCodes} recovery codes left` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void setup2fa()}>
            {twoFactorEnabled ? "Replace authenticator" : "Set up 2FA"}
          </Button>
          {twoFactorEnabled ? (
            <>
              <Button type="button" variant="outline" onClick={() => void disable2fa()}>
                Disable 2FA
              </Button>
              <Button type="button" variant="outline" onClick={() => void regenerateCodes()}>
                Regenerate recovery codes
              </Button>
            </>
          ) : null}
        </div>
        {secret ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-[var(--muted)]">
              Add this secret in your authenticator app, then enter a code.
            </p>
            <code className="block break-all rounded-xl bg-[var(--mist)] p-3 text-sm">
              {secret}
            </code>
            {otpauthUrl ? (
              <a
                href={otpauthUrl}
                className="text-xs text-[var(--signal-deep)] underline"
              >
                Open otpauth link
              </a>
            ) : null}
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="rounded-xl border border-[var(--mist)] bg-white px-3 dark:bg-[var(--night-elevated)]"
              />
              <Button type="button" onClick={() => void enable2fa()}>
                Enable
              </Button>
            </div>
          </div>
        ) : null}
        {twoFactorEnabled && !secret ? (
          <div className="mt-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code to disable / regenerate"
              className="w-full rounded-xl border border-[var(--mist)] bg-white px-3 py-2 text-sm dark:bg-[var(--night-elevated)]"
            />
          </div>
        ) : null}
        {recoveryCodes.length ? (
          <ul className="mt-4 grid gap-1 rounded-2xl border border-[var(--mist)] p-4 font-mono text-xs">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
