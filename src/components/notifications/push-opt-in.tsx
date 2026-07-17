"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushOptIn({ compact = false }: { compact?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    void fetch("/api/notifications/push")
      .then((r) => r.json())
      .then(async (d) => {
        setConfigured(Boolean(d.configured && d.publicKey));
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(Boolean(existing));
      })
      .catch(() => undefined);
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const meta = await fetch("/api/notifications/push").then((r) => r.json());
      if (!meta.publicKey) {
        setMessage("Push is not configured on this server yet.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was blocked.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(meta.publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Invalid subscription");
      }
      const res = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save subscription");
      }
      setSubscribed(true);
      setMessage("Push notifications enabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable push");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      await subscription?.unsubscribe();
      await fetch(
        `/api/notifications/push${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ""}`,
        { method: "DELETE" },
      );
      setSubscribed(false);
      setMessage("Push notifications disabled.");
    } catch {
      setMessage("Could not disable push");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  if (compact) {
    return (
      <Button
        type="button"
        variant="quiet"
        disabled={busy || (!configured && !subscribed)}
        onClick={() => void (subscribed ? disable() : enable())}
      >
        {subscribed ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
        {subscribed ? "Mute push" : "Enable push"}
      </Button>
    );
  }

  return (
    <div className="surface-panel mt-6 rounded-[var(--radius-xl)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Push notifications</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {configured
              ? "Get likes, comments, follows, messages, and calls even when Relune is closed."
              : "Server VAPID keys are required before push can be enabled."}
          </p>
          {message ? (
            <p className="mt-2 text-xs text-[var(--signal)]">{message}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant={subscribed ? "outline" : "solid"}
          disabled={busy || (!configured && !subscribed)}
          onClick={() => void (subscribed ? disable() : enable())}
        >
          {subscribed ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
          {busy ? "Working…" : subscribed ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  );
}
