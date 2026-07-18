import { z } from "zod";

import {
  body,
  clientIp,
  fail,
  guardApiAbuse,
  ok,
  requireUser,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  deviceFingerprint,
  upsertTrustedDevice,
} from "@/modules/auth/security";

export async function GET() {
  try {
    const u = await requireUser();
    return ok({
      devices: await prisma.trustedDevice.findMany({
        where: { userId: u.id },
        orderBy: { lastSeenAt: "desc" },
      }),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "auth:trusted-devices:post");
    const u = await requireUser();
    const data = await body(
      request,
      z.object({ label: z.string().trim().max(80).optional() }),
    ).catch(() => ({ label: undefined as string | undefined }));
    const ua = request.headers.get("user-agent");
    const ip = clientIp(request);
    const fingerprint = deviceFingerprint(ua, ip);
    const device = await upsertTrustedDevice({
      userId: u.id,
      fingerprint,
      label: data.label || "This device",
    });
    return ok({ device });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(r: Request) {
  try {
    await guardApiAbuse(r, "auth:trusted-devices:delete");
    const u = await requireUser();
    const { id } = await body(r, z.object({ id: z.string() }));
    await prisma.trustedDevice.deleteMany({ where: { id, userId: u.id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
