import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isMemberOnlyPath, safeCallbackUrl } from "@/lib/guest/paths";

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const path = request.nextUrl.pathname;
  const appSurface =
    path.startsWith("/calls") ||
    path.startsWith("/messages") ||
    path.startsWith("/home") ||
    path.startsWith("/u/") ||
    path.startsWith("/settings") ||
    path.startsWith("/notifications") ||
    path.startsWith("/explore") ||
    path.startsWith("/shorts") ||
    path.startsWith("/communities") ||
    path.startsWith("/post/") ||
    path.startsWith("/search") ||
    path.startsWith("/trending");

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set(
    "Permissions-Policy",
    appSurface
      ? "camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()"
      : "camera=(), microphone=(), display-capture=(), geolocation=(), interest-cohort=()",
  );
  // Avoid CSP nonces on React-rendered <script> tags — browsers strip nonce from the
  // DOM after parse, which causes a hydration mismatch and can blank the client tree.
  const isProd = process.env.NODE_ENV === "production";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  );
  response.headers.set("X-XSS-Protection", "0");
  if (isProd) {
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

async function hasSession(request: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  for (const cookieName of [
    "__Secure-authjs.session-token",
    "authjs.session-token",
  ]) {
    const token = await getToken({ req: request, secret, cookieName });
    if (token?.sub) return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (process.env.MAINTENANCE_MODE === "true") {
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

  if (isMemberOnlyPath(path) && !(await hasSession(request))) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set(
      "callbackUrl",
      safeCallbackUrl(path + request.nextUrl.search),
    );
    return applySecurityHeaders(NextResponse.redirect(signIn), request);
  }

  return applySecurityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
