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
import { SecuritySettings } from "@/components/auth/security-settings";
import { DeviceSecurityCard } from "@/components/auth/device-security-panel";
import { BlockedMutedList } from "@/components/social/blocked-muted-list";

const links = [
  { href: "/settings/profile", icon: UserRound, key: "profile" },
  { href: "/settings/privacy", icon: Lock, key: "privacy" },
  { href: "/settings/security", icon: Shield, key: "security" },
  { href: "/settings/bookmarks", icon: Link2, key: "bookmarks" },
  { href: "/settings#appearance", icon: Palette, key: "appearance" },
  { href: "/settings#language", icon: Globe2, key: "language" },
  { href: "/settings#accessibility", icon: UserRound, key: "accessibility" },
  { href: "/settings#notifications", icon: Bell, key: "notifications" },
  { href: "/settings#downloads", icon: Link2, key: "downloads" },
  { href: "/settings#data", icon: Globe2, key: "data" },
  { href: "/settings#sessions", icon: UserRound, key: "sessions" },
  { href: "/settings#blocked", icon: Ban, key: "blocked" },
  { href: "/settings#muted", icon: VolumeX, key: "muted" },
  { href: "/settings#account", icon: UserRound, key: "account" },
  { href: "/settings#accounts", icon: Link2, key: "accounts" },
];

export default function SettingsPage() {
  const { t, theme, setTheme, locale, setLocale } = useExperience();
  const [accounts, setAccounts] = useState<Array<{ id: string; provider: string; label: string }>>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [providerAvailability, setProviderAvailability] = useState<
    Record<OAuthProviderId, boolean>
  >({ google: false, apple: false, facebook: false, twitter: false });
  const [accountsMsg, setAccountsMsg] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);

  async function loadAccounts() {
    const d = await fetch("/api/auth/accounts").then((r) => r.json());
    setAccounts(d.accounts ?? []);
    setHasPassword(Boolean(d.hasPassword));
  }

  useEffect(() => {
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

  async function exportData() {
    setAccountBusy(true);
    setDataMsg(null);
    try {
      const res = await fetch("/api/account");
      const data = await res.json();
      if (!res.ok) {
        setDataMsg(data.error || "Export failed");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relune-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataMsg("Export downloaded.");
    } catch {
      setDataMsg("Export failed");
    } finally {
      setAccountBusy(false);
    }
  }

  async function clearLocalCache() {
    setDataMsg(null);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      localStorage.removeItem("relune-browse-state");
      setDataMsg("Local cache cleared on this device.");
    } catch {
      setDataMsg("Could not clear cache");
    }
  }

  async function lifecycle(action: "deactivate" | "delete") {
    const password = window.prompt(
      action === "delete"
        ? "Enter your password to permanently delete your account"
        : "Enter your password to deactivate your account",
    );
    if (password === null) return;
    if (action === "delete") {
      const confirm = window.prompt('Type DELETE to confirm permanent deletion');
      if (confirm !== "DELETE") return;
    }
    setAccountBusy(true);
    setDataMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          password: password || undefined,
          ...(action === "delete" ? { confirm: "DELETE" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDataMsg(data.error || "Request failed");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDataMsg("Request failed");
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <PageTransition className="section-shell max-w-5xl px-5 md:px-8">
      <div className="glass-strong premium-ring rounded-[2rem] p-6 md:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
        Control
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
        {t("settings", "title")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{t("settings", "subtitle")}</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          "Account, privacy, and security controls in one place",
          "Appearance and accessibility tuned for every device",
          "Production-grade session, device, and login management",
        ].map((item) => (
          <div key={item} className="rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-3 text-sm text-[var(--muted-strong)] shadow-[var(--shadow-sm)]">
            {item}
          </div>
        ))}
      </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map(({ href, icon: Icon, key }) => (
          <Link key={key} href={href}>
            <Card interactive className="flex items-center gap-3 p-5">
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
            className="mt-4 w-full min-h-11 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-sm)]"
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
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["Official platform updates", "Security alerts", "Community activity", "Product announcements"].map((item) => (
              <div key={item} className="rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-sm)]">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card id="accessibility">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "accessibility")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Reduce motion, improve contrast, and adjust text size for comfortable reading.
          </p>
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

        <Card id="downloads">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "downloads")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Control whether media can be saved from your public posts and stories.
          </p>
          <div className="mt-4 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] p-4 text-sm leading-7 text-[var(--muted-strong)] shadow-[var(--shadow-sm)]">
            Downloads are governed by your privacy settings, post visibility, and future creator permissions.
          </div>
        </Card>

        <Card id="data">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "data")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("settings", "dataHint")}
          </p>
          {dataMsg ? (
            <p className="mt-3 text-sm text-[var(--signal-deep)]">{dataMsg}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={accountBusy}
              onClick={() => void exportData()}
            >
              {t("settings", "exportData")}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={accountBusy}
              onClick={() => void clearLocalCache()}
            >
              {t("settings", "clearCache")}
            </Button>
          </div>
        </Card>

        <Card id="account">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "account")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("settings", "accountHint")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={accountBusy}
              onClick={() => void lifecycle("deactivate")}
            >
              {t("settings", "deactivate")}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={accountBusy}
              className="text-[var(--danger)]"
              onClick={() => void lifecycle("delete")}
            >
              {t("settings", "deleteAccount")}
            </Button>
          </div>
        </Card>

        <Card id="security">
          <SecuritySettings showDevices={false} />
        </Card>

        <DeviceSecurityCard />

        <Card id="blocked">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "blocked")}</h2>
          <BlockedMutedList mode="blocked" />
        </Card>
        <Card id="muted">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("settings", "muted")}</h2>
          <BlockedMutedList mode="muted" />
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
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)]"
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
