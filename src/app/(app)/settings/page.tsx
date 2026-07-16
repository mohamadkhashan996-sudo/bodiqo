"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Bell,
  Globe2,
  Link2,
  Lock,
  Palette,
  Shield,
  UserRound,
  VolumeX,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { useExperience } from "@/components/experience-provider";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import {
  OAUTH_PROVIDER_ORDER,
  PROVIDER_SHORT,
  type OAuthProviderId,
} from "@/modules/auth/providers";

const links = [
  { href: "/settings/privacy", icon: Lock, key: "privacy" },
  { href: "/settings#security", icon: Shield, key: "security" },
  { href: "/settings#appearance", icon: Palette, key: "appearance" },
  { href: "/settings#language", icon: Globe2, key: "language" },
  { href: "/settings#notifications", icon: Bell, key: "notifications" },
  { href: "/settings#sessions", icon: UserRound, key: "sessions" },
  { href: "/settings#blocked", icon: Ban, key: "blocked" },
  { href: "/settings#muted", icon: VolumeX, key: "muted" },
  { href: "/settings#accounts", icon: Link2, key: "accounts" },
];

export default function SettingsPage() {
  const { t, theme, setTheme, locale, setLocale } = useExperience();
  const [sessions, setSessions] = useState<Array<{ id: string; deviceLabel: string | null }>>([]);
  const [devices, setDevices] = useState<Array<{ id: string; label: string | null }>>([]);
  const [history, setHistory] = useState<Array<{ id: string; provider: string | null; createdAt: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; provider: string; label: string }>>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [providerAvailability, setProviderAvailability] = useState<
    Record<OAuthProviderId, boolean>
  >({ google: false, apple: false, facebook: false, twitter: false });
  const [accountsMsg, setAccountsMsg] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  async function loadAccounts() {
    const d = await fetch("/api/auth/accounts").then((r) => r.json());
    setAccounts(d.accounts ?? []);
    setHasPassword(Boolean(d.hasPassword));
  }

  useEffect(() => {
    fetch("/api/auth/sessions").then((r) => r.json()).then((d) => setSessions(d.sessions ?? [])).catch(() => {});
    fetch("/api/auth/trusted-devices").then((r) => r.json()).then((d) => setDevices(d.devices ?? [])).catch(() => {});
    fetch("/api/auth/login-history").then((r) => r.json()).then((d) => setHistory(d.history ?? [])).catch(() => {});
    void loadAccounts().catch(() => {});
    fetch("/api/auth/providers-config")
      .then((r) => r.json())
      .then((d) => {
        const map = { google: false, apple: false, facebook: false, twitter: false };
        for (const p of d.oauth ?? []) {
          map[p.id as OAuthProviderId] = Boolean(p.available);
        }
        setProviderAvailability(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? "high" : "";
    document.documentElement.dataset.text = largeText ? "large" : "";
  }, [highContrast, largeText]);

  async function setup() {
    const d = await fetch("/api/auth/2fa/setup", { method: "POST" }).then((r) => r.json());
    setSecret(d.secret ?? "");
  }

  return (
    <PageTransition className="mx-auto max-w-3xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
        Control
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
        {t("settings", "title")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{t("settings", "subtitle")}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, key }) => (
          <Link key={key} href={href}>
            <Card interactive className="flex items-center gap-3">
              <Icon className="size-4 text-[var(--signal)]" />
              <span className="text-sm font-medium">{t("settings", key)}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        <Card id="appearance">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "appearance")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["LIGHT", "DARK", "SYSTEM"] as const).map((mode) => (
              <Button
                key={mode}
                variant={theme === mode ? "signal" : "outline"}
                type="button"
                onClick={() => setTheme(mode)}
              >
                {t("common", mode.toLowerCase())}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
              High contrast
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} />
              Large text
            </label>
          </div>
        </Card>

        <Card id="language">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "language")}</h2>
          <select
            className="mt-4 w-full rounded-2xl border border-[var(--mist)] bg-[var(--glass)] px-4 py-3 text-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            aria-label={t("common", "language")}
          >
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_LABELS[code]}
              </option>
            ))}
          </select>
        </Card>

        <Card id="notifications">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "notifications")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Push and email preferences sync with your account. In-app alerts stay on by default.
          </p>
        </Card>

        <Card id="security">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "security")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Two-factor authentication for an extra layer of calm.</p>
          <Button className="mt-4" type="button" onClick={() => void setup()}>
            Set up 2FA
          </Button>
          {secret ? (
            <div className="mt-4">
              <code className="block rounded-xl bg-[var(--mist)] p-3 text-sm">Secret: {secret}</code>
              <div className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  className="rounded-xl border border-[var(--mist)] bg-white px-3 dark:bg-[var(--night-elevated)]"
                />
                <Button
                  type="button"
                  onClick={() =>
                    void fetch("/api/auth/2fa/enable", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code }),
                    })
                  }
                >
                  Enable
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card id="sessions">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "sessions")}</h2>
          {sessions.map((s) => (
            <div key={s.id} className="mt-3 flex justify-between text-sm">
              <span>{s.deviceLabel ?? "Unknown device"}</span>
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
            </div>
          ))}
          <h3 className="mt-6 text-sm font-semibold">Trusted devices</h3>
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
          <h3 className="mt-6 text-sm font-semibold">Login history</h3>
          {history.slice(0, 8).map((item) => (
            <p key={item.id} className="mt-2 text-sm text-[var(--muted)]">
              {item.provider ?? "credentials"} · {new Date(item.createdAt).toLocaleString()}
            </p>
          ))}
          <Button
            className="mt-6"
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
        </Card>

        <Card id="blocked">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "blocked")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Manage blocks from profiles. List sync arrives with account graph APIs.</p>
        </Card>
        <Card id="muted">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "muted")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Muted accounts stay out of your feed without blocking.</p>
        </Card>
        <Card id="accounts">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "accounts")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Connect Google, Apple, Facebook, or X. Same-email logins are linked — never duplicated.
            {hasPassword ? " Email & password stays available." : ""}
          </p>
          {accountsMsg ? (
            <p className="mt-3 text-sm text-[var(--signal-deep)]">{accountsMsg}</p>
          ) : null}
          <ul className="mt-5 space-y-3">
            {OAUTH_PROVIDER_ORDER.map((id) => {
              const connected = accounts.find((a) => a.provider === id);
              const available = providerAvailability[id];
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mist)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{PROVIDER_SHORT[id]}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {connected
                        ? "Connected"
                        : available
                          ? "Not connected"
                          : "Not configured on this server"}
                    </p>
                  </div>
                  {connected ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setAccountsMsg(null);
                        const res = await fetch(
                          `/api/auth/accounts?provider=${encodeURIComponent(id)}`,
                          { method: "DELETE" },
                        );
                        const data = await res.json();
                        if (!res.ok) {
                          setAccountsMsg(data.error || "Could not disconnect.");
                          return;
                        }
                        setAccountsMsg(`${PROVIDER_SHORT[id]} disconnected.`);
                        await loadAccounts();
                      }}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={!available}
                      onClick={() =>
                        void signIn(id, { callbackUrl: "/settings#accounts" })
                      }
                    >
                      Connect
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Button variant="outline" type="button" onClick={() => void signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    </PageTransition>
  );
}
