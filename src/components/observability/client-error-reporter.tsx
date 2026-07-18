"use client";

import { useEffect } from "react";

function isExtensionNoise(value: string | undefined) {
  return /chrome-extension:|moz-extension:|safari-web-extension:|safari-extension:|webkit-masked-url:/i.test(
    value || "",
  );
}

function report(error: Error & { digest?: string }, path?: string) {
  const stack = error.stack || "";
  if (isExtensionNoise(stack) || isExtensionNoise(error.message)) return;

  const payload = {
    message: error.message || "Unknown client error",
    name: error.name,
    stack: stack.slice(0, 8000),
    path:
      path ||
      (typeof window !== "undefined" ? window.location.pathname : undefined),
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
      const err =
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "window.error");
      if (
        isExtensionNoise(err.stack) ||
        isExtensionNoise(event.filename) ||
        isExtensionNoise(err.message)
      ) {
        return;
      }
      report(err);
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const err =
        reason instanceof Error
          ? reason
          : new Error(
              typeof reason === "string" ? reason : "unhandledrejection",
            );
      if (isExtensionNoise(err.stack) || isExtensionNoise(err.message)) return;
      report(err);
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
