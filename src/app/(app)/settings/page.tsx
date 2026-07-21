"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Accessibility,
  BadgeCheck,
  Ban,
  Bell,
  Bookmark,
  Database,
  Download,
  Globe2,
  Lock,
  MonitorSmartphone,
  Palette,
  Shield,
  Trash2,
  UserRound,
  VolumeX,
} from "lucide-react";

import { DeviceSecurityCard } from "@/components/auth/device-security-panel";
import { SecuritySettings } from "@/components/auth/security-settings";
import { useExperience } from "@/components/experience-provider";
import { PageTransition } from "@/components/motion/primitives";
import { PushOptIn } from "@/components/notifications/push-opt-in";
import {
  type AccountLifecycleAction,
  AccountLifecycleModal,
} from "@/components/settings/account-lifecycle-modal";
import { BlockedMutedList } from "@/components/social/blocked-muted-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Locale, LOCALE_LABELS, LOCALES } from "@/i18n/config";
const A11Y_KEYS = {
  contrast: "relune.a11y.contrast",
  largeText: "relune.a11y.largeText",
  reduceMotion: "relune.a11y.reduceMotion",
} as const;

const NOTIF_KEY = "relune.notif.prefs";

type NotifPrefs = {
  social: boolean;
  messages: boolean;
  calls: boolean;
  live: boolean;
  community: boolean;
  product: boolean;
  pushEnabled: boolean;
  hideMessagePreview: boolean;
};

const DEFAULT_NOTIFS: NotifPrefs = {
  social: true,
  messages: true,
  calls: true,
  live: true,
  community: true,
  product: true,
  pushEnabled: true,
  hideMessagePreview: false,
};

const links = [
  { href: "/settings/profile", icon: UserRound, key: "profile" },
  { href: "/settings/privacy", icon: Lock, key: "privacy" },
  { href: "/settings/security", icon: Shield, key: "security" },
  { href: "/settings/verification", icon: BadgeCheck, key: "verification" },
  { href: "/saved", icon: Bookmark, key: "bookmarks" },
  { href: "/settings#appearance", icon: Palette, key: "appearance" },
  { href: "/settings#language", icon: Globe2, key: "language" },
  {
    href: "/settings#accessibility",
    icon: Accessibility,
    key: "accessibility",
  },
  { href: "/settings#notifications", icon: Bell, key: "notifications" },
  { href: "/settings#downloads", icon: Download, key: "downloads" },
  { href: "/settings#data", icon: Database, key: "data" },
  { href: "/settings#sessions", icon: MonitorSmartphone, key: "sessions" },
  { href: "/settings#blocked", icon: Ban, key: "blocked" },
  { href: "/settings#muted", icon: VolumeX, key: "muted" },
  { href: "/settings#account", icon: Trash2, key: "account" },
];

function readBool(key: string, fallback = false) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1" || v === "true";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function applyA11y(opts: {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
}) {
  const root = document.documentElement;
  root.dataset.contrast = opts.highContrast ? "high" : "";
  root.dataset.text = opts.largeText ? "large" : "";
  root.dataset.motion = opts.reduceMotion ? "reduce" : "";
}

export default function SettingsPage() {
  const { t, theme, setTheme, locale, setLocale } = useExperience();
  const [hasPassword, setHasPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [a11yReady, setA11yReady] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [accountBusy, setAccountBusy] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  const [lifecycleAction, setLifecycleAction] =
    useState<AccountLifecycleAction | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [allowDownloads, setAllowDownloads] = useState(true);

  useEffect(() => {
    const contrast = readBool(A11Y_KEYS.contrast);
    const text = readBool(A11Y_KEYS.largeText);
    const motion =
      readBool(A11Y_KEYS.reduceMotion) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setHighContrast(contrast);
    setLargeText(text);
    setReduceMotion(motion);
    applyA11y({
      highContrast: contrast,
      largeText: text,
      reduceMotion: motion,
    });
    setA11yReady(true);

    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setNotifPrefs({ ...DEFAULT_NOTIFS, ...JSON.parse(raw) });
      setAllowDownloads(readBool("relune.downloads.allow", true));
    } catch {
      /* ignore */
    }

    void fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) {
          const next = { ...DEFAULT_NOTIFS, ...d.preferences };
          setNotifPrefs(next);
          try {
            localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});

    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => {
        setTwoFactorEnabled(Boolean(d.user?.twoFactorEnabled));
        setHasPassword(Boolean(d.user?.hasPassword));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!a11yReady) return;
    writeBool(A11Y_KEYS.contrast, highContrast);
    writeBool(A11Y_KEYS.largeText, largeText);
    writeBool(A11Y_KEYS.reduceMotion, reduceMotion);
    applyA11y({ highContrast, largeText, reduceMotion });
  }, [highContrast, largeText, reduceMotion, a11yReady]);

  function updateNotif<K extends keyof NotifPrefs>(key: K, value: boolean) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      void fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      }).catch(() => undefined);
      return next;
    });
  }

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

  async function confirmLifecycle(input: {
    password?: string;
    totpCode?: string;
    confirm: string;
  }) {
    if (!lifecycleAction) return;
    setAccountBusy(true);
    setLifecycleError(null);
    setDataMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lifecycleAction,
          password: input.password,
          totpCode: input.totpCode,
          confirm: input.confirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLifecycleError(data.error || "Request failed");
        return;
      }
      setLifecycleAction(null);
      await signOut({ callbackUrl: "/" });
    } catch {
      setLifecycleError("Request failed");
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <PageTransition className="section-shell max-w-5xl">
      <div className="glass-strong premium-ring rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6 md:p-8">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--signal)] uppercase">
          Control
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          {t("settings", "title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          {t("settings", "subtitle")}
        </p>
        <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-3">
          {[
            "Account, privacy, and security controls in one place",
            "Appearance and accessibility tuned for every device",
            "Production-grade session, device, and login management",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-3 text-sm text-[var(--muted-strong)] shadow-[var(--shadow-sm)]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <nav
        className="mt-8 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Settings sections"
      >
        {links.map(({ href, icon: Icon, key }) => (
          <Link key={key} href={href}>
            <Card interactive className="flex items-center gap-3 p-5">
              <Icon
                className="size-4 shrink-0 text-[var(--signal)]"
                aria-hidden
              />
              <span className="text-sm font-medium">{t("settings", key)}</span>
            </Card>
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-5">
        <Card id="appearance">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "appearance")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Theme syncs to your account and this device.
          </p>
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Theme"
          >
            {(["LIGHT", "DARK", "SYSTEM"] as const).map((mode) => (
              <Button
                key={mode}
                variant={theme === mode ? "signal" : "outline"}
                type="button"
                onClick={() => setTheme(mode)}
                aria-pressed={theme === mode}
              >
                {t("common", mode.toLowerCase())}
              </Button>
            ))}
          </div>
        </Card>

        <Card id="language">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "language")}
          </h2>
          <select
            className="mt-4 min-h-11 w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-sm)]"
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

        <Card id="accessibility">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "accessibility")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Preferences are saved on this device and apply immediately.
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <label className="inline-flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="size-4 accent-[var(--signal-deep)]"
              />
              High contrast
            </label>
            <label className="inline-flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={largeText}
                onChange={(e) => setLargeText(e.target.checked)}
                className="size-4 accent-[var(--signal-deep)]"
              />
              Large text
            </label>
            <label className="inline-flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="size-4 accent-[var(--signal-deep)]"
              />
              Reduce motion
            </label>
          </div>
        </Card>

        <Card id="notifications">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "notifications")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Security and verification alerts always deliver. Category toggles
            sync to your account and control in-app and push delivery.
          </p>
          <div className="mt-4">
            <PushOptIn />
          </div>
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            {(
              [
                ["social", "Likes, comments, follows", false],
                ["messages", "Direct messages", false],
                ["calls", "Voice and video calls", false],
                ["live", "Live streams and gifts", false],
                ["community", "Community activity", false],
                ["product", "Product announcements", false],
                ["pushEnabled", "Browser push notifications", false],
                ["hideMessagePreview", "Hide message text in push", false],
              ] as const
            ).map(([key, label, locked]) => (
              <label
                key={key}
                className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]"
              >
                <span>
                  {label}
                  {locked ? (
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      Always on
                    </span>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  disabled={locked}
                  onChange={(e) => updateNotif(key, e.target.checked)}
                  className="size-4 accent-[var(--signal-deep)]"
                />
              </label>
            ))}
          </div>
          <Link
            href="/notifications"
            className="mt-4 inline-block text-sm font-semibold text-[var(--signal-deep)] hover:underline"
          >
            Open notification inbox
          </Link>
        </Card>

        <Card id="downloads">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "downloads")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Prefer whether media from public posts can be saved on this device.
            Creators and privacy settings still control what others can access.
          </p>
          <label className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
            <span>Allow media downloads on this device</span>
            <input
              type="checkbox"
              checked={allowDownloads}
              onChange={(e) => {
                setAllowDownloads(e.target.checked);
                writeBool("relune.downloads.allow", e.target.checked);
              }}
              className="size-4 accent-[var(--signal-deep)]"
            />
          </label>
        </Card>

        <Card id="data">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "data")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("settings", "dataHint")}
          </p>
          {dataMsg ? (
            <p className="mt-3 text-sm text-[var(--signal-deep)]" role="status">
              {dataMsg}
            </p>
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
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "account")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("settings", "accountHint")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link
              href="/settings/profile"
              className="font-semibold text-[var(--signal-deep)] hover:underline"
            >
              Edit profile
            </Link>
            <span className="text-[var(--mist-strong)]">·</span>
            <Link
              href="/settings/security"
              className="font-semibold text-[var(--signal-deep)] hover:underline"
            >
              Security & password
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={accountBusy}
              onClick={() => {
                setLifecycleError(null);
                setLifecycleAction("deactivate");
              }}
            >
              {t("settings", "deactivate")}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={accountBusy}
              className="text-[var(--danger)]"
              onClick={() => {
                setLifecycleError(null);
                setLifecycleAction("delete");
              }}
            >
              {t("settings", "deleteAccount")}
            </Button>
          </div>
        </Card>

        <Card id="security">
          <SecuritySettings showDevices={false} />
        </Card>

        <div id="sessions">
          <DeviceSecurityCard />
        </div>

        <Card id="blocked">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "blocked")}
          </h2>
          <BlockedMutedList mode="blocked" />
        </Card>
        <Card id="muted">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("settings", "muted")}
          </h2>
          <BlockedMutedList mode="muted" />
        </Card>
        <Button
          variant="outline"
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Sign out
        </Button>
      </div>

      <AccountLifecycleModal
        open={lifecycleAction !== null}
        action={lifecycleAction}
        hasPassword={hasPassword}
        twoFactorEnabled={twoFactorEnabled}
        busy={accountBusy}
        error={lifecycleError}
        onClose={() => {
          if (accountBusy) return;
          setLifecycleAction(null);
          setLifecycleError(null);
        }}
        onConfirm={(input) => void confirmLifecycle(input)}
      />
    </PageTransition>
  );
}
