import { NextResponse } from "next/server";
import { renderPrometheus, metricsSnapshot } from "@/lib/metrics";
import { recentErrors } from "@/lib/error-tracking";
import { requireStaff, fail } from "@/lib/api";

function authorized(request: Request) {
  const token = process.env.METRICS_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") || "";
  if (header === `Bearer ${token}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("token") === token;
}

/** Prometheus text or JSON snapshot. Auth via METRICS_TOKEN or staff session. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "prometheus";
    const allowed = authorized(request);
    if (!allowed) {
      await requireStaff("monitoring:read");
    }

    if (format === "json") {
      return NextResponse.json({
        ...metricsSnapshot(),
        recentErrors: recentErrors().slice(0, 20),
      });
    }

    return new NextResponse(renderPrometheus(), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
