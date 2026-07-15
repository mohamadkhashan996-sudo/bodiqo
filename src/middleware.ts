import { NextResponse, type NextRequest } from "next/server";
import { SETUP_COOKIE, isValidSetupCookie } from "@/lib/setup-cookie";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never HTML-redirect Auth.js or setup APIs — clients expect JSON.
  const allowed =
    pathname.startsWith("/setup") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/i18n") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";

  if (allowed) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SETUP_COOKIE)?.value;
  if (await isValidSetupCookie(cookie)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/setup";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
