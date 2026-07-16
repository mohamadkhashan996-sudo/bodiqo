import { NextResponse, type NextRequest } from "next/server";

/**
 * Phase 1: lightweight edge guard.
 * Auth gating for private app routes lands in Phase 2 with full session checks.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all navigations
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Placeholder for future private-route enforcement
  if (pathname.startsWith("/home") || pathname.startsWith("/admin")) {
    // Session enforcement arrives with completed Auth.js wiring (Phase 2).
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
