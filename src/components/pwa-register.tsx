"use client";

import { useEffect } from "react";

function isLocalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

async function clearServiceWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NEXT_PUBLIC_PWA === "false") return;

    // Never keep a SW on local/dev — it can pin stale auth/UI bundles.
    if (process.env.NODE_ENV === "development" || isLocalHost()) {
      void clearServiceWorkers();
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
