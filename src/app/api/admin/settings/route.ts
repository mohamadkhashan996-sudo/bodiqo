import { NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/assert-admin";
import { clientIp, logActivity } from "@/lib/activity-log";
import { getAllSettings, setSetting } from "@/lib/settings";
import { SETTING_KEYS, type SettingKey } from "@/lib/settings-schema";

export async function GET() {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const admin = await assertSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const key = body.key as SettingKey;
    if (!Object.values(SETTING_KEYS).includes(key)) {
      return NextResponse.json(
        { error: "Invalid settings key" },
        { status: 400 },
      );
    }
    const value = await setSetting(key, body.value);
    await logActivity({
      actorId: admin.user.id,
      actorEmail: admin.user.email,
      action: "settings.update",
      entity: "Setting",
      entityId: key,
      summary: `Updated settings: ${key}`,
      ip: clientIp(request),
    });
    return NextResponse.json({ ok: true, value });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 400 },
    );
  }
}
