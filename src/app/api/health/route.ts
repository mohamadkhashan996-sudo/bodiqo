import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { site } from "@/config/site";

/** Liveness — process is up */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "health";

  if (mode === "live") {
    return NextResponse.json({
      ok: true,
      service: site.name.toLowerCase(),
      mode: "live",
      time: new Date().toISOString(),
    });
  }

  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - started;
    const payload = {
      ok: true,
      service: site.name.toLowerCase(),
      mode: mode === "ready" ? "ready" : "health",
      database: "up",
      dbMs,
      uptimeSec: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (error) {
    logger.error("healthcheck_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        ok: false,
        service: site.name.toLowerCase(),
        database: "down",
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
