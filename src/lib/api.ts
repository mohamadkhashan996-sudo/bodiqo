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

export async function requireStaff(permission: Permission = "admin:access") {
  const user = await requireUser();
  if (!isStaff(user.role) || !can(user.role, permission)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  return user as typeof user & { role: Role };
}

export async function requirePermission(permission: Permission) {
  return requireStaff(permission);
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
  return NextResponse.json(result.body, { status: result.status });
}

export function paramsId(context: { params: Promise<Record<string, string>> }) {
  return context.params;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Reject cross-site POSTs in production when Origin is present and mismatched */
export function assertSameOrigin(request: Request) {
  if (process.env.NODE_ENV !== "production") return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set(
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
  if (allowed.size && !allowed.has(origin)) {
    throw new AppError("Invalid origin", 403, "ORIGIN_FORBIDDEN");
  }
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
