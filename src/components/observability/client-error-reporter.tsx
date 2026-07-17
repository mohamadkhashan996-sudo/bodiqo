"use client";

import { useEffect } from "react";

function report(error: Error & { digest?: string }, path?: string) {
  const payload = {
    message: error.message || "Unknown client error",
    name: error.name,
    stack: error.stack?.slice(0, 8000),
    path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
    digest: error.digest,
  };
  try {
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

/** Installs window error listeners once per session. */
export function ClientErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      report(
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "window.error"),
      );
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      report(
        reason instanceof Error
          ? reason
          : new Error(typeof reason === "string" ? reason : "unhandledrejection"),
      );
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

export function reportClientError(
  error: Error & { digest?: string },
  path?: string,
) {
  report(error, path);
}
