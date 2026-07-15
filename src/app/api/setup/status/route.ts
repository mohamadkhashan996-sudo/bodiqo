import { NextResponse } from "next/server";
import {
  SETUP_COOKIE,
  isSetupComplete,
  setupCookieValue,
} from "@/lib/setup";

export async function GET() {
  const complete = await isSetupComplete();
  const res = NextResponse.json({ complete });

  if (complete) {
    const value = await setupCookieValue();
    if (value) {
      res.cookies.set(SETUP_COOKIE, value, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 5,
      });
    }
  }

  return res;
}
