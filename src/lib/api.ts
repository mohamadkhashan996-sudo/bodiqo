import { NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { auth } from "@/modules/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { can, isStaff, type Permission } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { writeSecurityEvent } from "@/modules/admin/services/audit";
import { site } from "@/config/site";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id)
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return session.user;
}

export async function optionalUser() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}

export async function requireStaff(permission: Permission = "admin:access") {
  const user = await requireUser();
  if (!isStaff(user.role) || !can(user.role, permission)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  return user as typeof user & { role: Role };
}

export async function body<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AppError("Invalid JSON", 400);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError("Invalid request", 400, "VALIDATION_ERROR");
  return parsed.data;
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown) {
  const result = toErrorResponse(error);
  if (result.status >= 500) {
    void import("@/lib/metrics").then(({ incCounter }) =>
      incCounter("relune_http_errors_total", { status: String(result.status) }),
    );
  }
  return NextResponse.json(result.body, { status: result.status });
}

/**
 * Client IP for rate limiting.
 * Prefer the left-most X-Forwarded-For hop (original client) when behind a
 * trusted reverse proxy. Spoofing is mitigated by only trusting the header
 * when TRUST_PROXY is enabled (default true in production).
 */
export function clientIp(request: Request) {
  const trustProxy =
    process.env.TRUST_PROXY === "true" ||
    (process.env.TRUST_PROXY !== "false" &&
      process.env.NODE_ENV === "production");

  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts[0]) return parts[0];
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  return "unknown";
}

function allowedOrigins() {
  return new Set(
    [site.url, process.env.AUTH_URL, process.env.NEXTAUTH_URL]
      .filter(Boolean)
      .map((u) => {
        try {
          return new URL(u as string).origin;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[],
  );
}

/**
 * CSRF defense for cookie-authenticated mutating requests:
 * - Reject cross-site Sec-Fetch-Site
 * - Require Origin/Referer match against allowlist when configured
 * Enforced in all environments when allowed origins are configured.
 */
export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite &&
    fetchSite !== "same-origin" &&
    fetchSite !== "none" &&
    fetchSite !== "same-site"
  ) {
    throw new AppError("Invalid origin", 403, "ORIGIN_FORBIDDEN");
  }

  const allowed = allowedOrigins();
  if (!allowed.size) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Origin not configured", 403, "ORIGIN_FORBIDDEN");
    }
    return;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    if (!allowed.has(origin)) {
      throw new AppError("Invalid origin", 403, "ORIGIN_FORBIDDEN");
    }
    return;
  }

  // Same-origin navigations / some native clients omit Origin — accept Referer.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return;
    } catch {
      /* fall through */
    }
  }

  // Non-browser clients (curl, server jobs) often omit both — allow only outside
  // production, or when Sec-Fetch-Site is absent / "none".
  if (process.env.NODE_ENV !== "production" && !fetchSite) return;
  if (fetchSite === "none" || fetchSite === "same-origin") return;

  throw new AppError("Invalid origin", 403, "ORIGIN_FORBIDDEN");
}

/** API abuse guard — call at the top of sensitive handlers */
export async function guardApiAbuse(
  request: Request,
  bucket: string,
  limit = 60,
  windowMs = 60_000,
) {
  assertSameOrigin(request);
  const ip = clientIp(request);
  const result = await rateLimit(`${bucket}:${ip}`, limit, windowMs);
  if (!result.ok) {
    await writeSecurityEvent({
      type: "api.rate_limited",
      severity: "warn",
      ip,
      meta: { bucket },
    });
    throw new AppError("Too many requests", 429, "RATE_LIMITED");
  }
  return result;
}
