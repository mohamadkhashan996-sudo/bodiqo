"use client";

import { useEffect } from "react";

/**
 * Relune SW is push-only (no fetch interception), so it is safe to register
 * in development too — required for local Web Push opt-in.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NEXT_PUBLIC_PWA === "false") return;
    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Push-only SW, but still force an update so a stale worker from an
        // older Relune build cannot linger across .next rebuilds.
        void registration.update();
      })
      .catch(() => undefined);
  }, []);
  return null;
}
