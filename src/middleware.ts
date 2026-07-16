import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge security headers + lightweight route signals.
 * AuthZ for /admin is enforced in the admin layout + API requireStaff().
 */
export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "true") {
    const path = request.nextUrl.pathname;
    const allowed =
      path.startsWith("/api/health") ||
      path.startsWith("/api/auth") ||
      path.startsWith("/sign-in") ||
      path.startsWith("/maintenance") ||
      path.startsWith("/_next");
    if (!allowed) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  const response = NextResponse.next();
  const path = request.nextUrl.pathname;
  const realtime =
    path.startsWith("/calls") ||
    path.startsWith("/messages") ||
    path.startsWith("/home");

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    realtime
      ? "camera=(self), microphone=(self), geolocation=()"
      : "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  response.headers.set("X-XSS-Protection", "0");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  response.headers.set(
    "x-request-id",
    request.headers.get("x-request-id") || crypto.randomUUID(),
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
