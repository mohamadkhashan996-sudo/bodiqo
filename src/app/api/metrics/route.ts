import { NextResponse } from "next/server";

import { fail, requireStaff } from "@/lib/api";
import { recentErrors } from "@/lib/error-tracking";
import { metricsSnapshot, renderPrometheus } from "@/lib/metrics";

function authorized(request: Request) {
  const token = process.env.METRICS_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${token}`;
}

/** Prometheus text or JSON snapshot. Auth via Bearer METRICS_TOKEN or staff session. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "prometheus";
    if (!authorized(request)) {
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
