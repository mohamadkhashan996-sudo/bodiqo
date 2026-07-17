import { logger } from "@/lib/logger";
import { incCounter } from "@/lib/metrics";

export type ErrorContext = {
  requestId?: string;
  path?: string;
  userId?: string;
  source?: "server" | "client" | "worker";
  extra?: Record<string, unknown>;
};

type RecentError = {
  at: string;
  message: string;
  name?: string;
  stack?: string;
  context?: ErrorContext;
};

const recent: RecentError[] = [];
const MAX_RECENT = 50;

function pushRecent(entry: RecentError) {
  recent.unshift(entry);
  if (recent.length > MAX_RECENT) recent.pop();
}

export function recentErrors() {
  return [...recent];
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

/** Parse Sentry DSN → store endpoint (optional remote error tracking). */
function sentryEndpoint(dsn: string) {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    const host = url.host;
    return {
      url: `https://${host}/api/${projectId}/store/`,
      publicKey,
    };
  } catch {
    return null;
  }
}

async function forwardToSentry(
  error: ReturnType<typeof serializeError>,
  context?: ErrorContext,
) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const endpoint = sentryEndpoint(dsn);
  if (!endpoint) return;

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    server_name: process.env.HOSTNAME || "relune",
    release: process.env.APP_VERSION || process.env.npm_package_version,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    message: error.message,
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: error.stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ filename: line.trim() })),
              }
            : undefined,
        },
      ],
    },
    tags: {
      source: context?.source || "server",
      path: context?.path,
    },
    user: context?.userId ? { id: context.userId } : undefined,
    extra: {
      requestId: context?.requestId,
      ...context?.extra,
    },
  };

  try {
    await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=relune/1.0, sentry_key=${endpoint.publicKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn("sentry_forward_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function captureException(
  error: unknown,
  context?: ErrorContext,
) {
  const serialized = serializeError(error);
  pushRecent({
    at: new Date().toISOString(),
    ...serialized,
    context,
  });
  incCounter("relune_errors_total", {
    source: context?.source || "server",
  });
  logger.error("exception", {
    ...serialized,
    requestId: context?.requestId,
    path: context?.path,
    userId: context?.userId,
    source: context?.source || "server",
    ...context?.extra,
  });
  void forwardToSentry(serialized, context);
}

export function installProcessErrorHandlers() {
  if ((globalThis as { __reluneErrorsInstalled?: boolean }).__reluneErrorsInstalled) {
    return;
  }
  (globalThis as { __reluneErrorsInstalled?: boolean }).__reluneErrorsInstalled =
    true;

  process.on("unhandledRejection", (reason) => {
    void captureException(reason, { source: "worker", extra: { kind: "unhandledRejection" } });
  });
  process.on("uncaughtException", (error) => {
    void captureException(error, { source: "worker", extra: { kind: "uncaughtException" } });
  });
}
