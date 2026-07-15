import { NextResponse, type NextRequest } from "next/server";

/**
 * Storefront is always public. Setup wizard is never forced on visitors.
 * Legacy /setup → /admin/setup. Incomplete installs may only open /admin/setup
 * under /admin (not the full console until an admin exists).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/setup", "/setup/:path*"],
};
