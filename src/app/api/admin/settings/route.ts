import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettings, setSetting } from "@/lib/settings";
import { SETTING_KEYS, type SettingKey } from "@/lib/settings-schema";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getAllSettings();
    // Mask secret fields in response copies for display still needed for form - return full for admin
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await assertAdmin())) {
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
