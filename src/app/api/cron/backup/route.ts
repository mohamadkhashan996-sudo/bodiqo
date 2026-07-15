import { NextResponse } from "next/server";
import { maybeRunAutoBackup } from "@/lib/backup";

/**
 * External cron endpoint:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your.site/api/cron/backup
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await maybeRunAutoBackup("cron");
  return NextResponse.json({
    ok: true,
    created: Boolean(record),
    backup: record,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
