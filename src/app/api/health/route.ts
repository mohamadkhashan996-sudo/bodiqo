import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { site } from "@/config/site";
import { redisPing } from "@/lib/redis";
import { guardApiAbuse } from "@/lib/api";

/** Liveness — process is up */
export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "health:get", 120, 60000);
  } catch {
    // Health probes should degrade gracefully under abuse rather than throw.
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }
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
    const redisConfigured = Boolean(process.env.REDIS_URL);
    const redisUp = redisConfigured ? await redisPing() : null;
    const ready = mode !== "ready" || !redisConfigured || redisUp === true;

    const payload = {
      ok: ready,
      service: site.name.toLowerCase(),
      mode: mode === "ready" ? "ready" : "health",
      database: "up",
      dbMs,
      redis: redisConfigured ? (redisUp ? "up" : "down") : "not_configured",
      uptimeSec: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    };

    void import("@/lib/metrics").then(({ observeMs, incCounter }) => {
      observeMs("relune_health_db_ms", dbMs);
      incCounter("relune_health_checks_total", {
        mode: mode === "ready" ? "ready" : "health",
        ok: ready ? "true" : "false",
      });
    });

    return NextResponse.json(payload, { status: ready ? 200 : 503 });
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
