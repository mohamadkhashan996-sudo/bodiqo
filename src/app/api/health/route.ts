import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "cirqua",
      time: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("healthcheck_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, service: "cirqua" },
      { status: 503 },
    );
  }
}
