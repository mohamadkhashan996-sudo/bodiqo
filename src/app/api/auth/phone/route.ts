import { z } from "zod";

import {
  body,
  clientIp,
  fail,
  guardApiAbuse,
  ok,
  requireUser,
} from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/modules/auth/phone";
import { consumePhoneOtp, issuePhoneOtp } from "@/modules/auth/phone-otp";
import { sendSecurityAlert } from "@/modules/auth/security";

export async function GET() {
  try {
    const user = await requireUser();
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, phoneVerified: true },
    });
    return ok({
      phone: me?.phone,
      phoneVerified: Boolean(me?.phoneVerified),
    });
  } catch (e) {
    return fail(e);
  }
}

/** Start binding a phone number to the signed-in account */
export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "phone:bind", 10);
    const user = await requireUser();
    const data = await body(
      request,
      z.object({ phone: z.string().min(8).max(20) }),
    );
    const phone = normalizePhone(data.phone);
    const taken = await prisma.user.findFirst({
      where: { phone, NOT: { id: user.id } },
    });
    if (taken)
      throw new AppError("Phone already linked to another account", 409);

    await prisma.user.update({
      where: { id: user.id },
      data: { phone, phoneVerified: null },
    });

    const result = await issuePhoneOtp({
      phone,
      purpose: "VERIFY",
      userId: user.id,
      ip: clientIp(request),
    });
    return ok({
      ok: true,
      phone: result.phone,
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    });
  } catch (e) {
    return fail(e);
  }
}

/** Confirm phone OTP and mark verified */
export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "phone:verify", 20);
    const user = await requireUser();
    const data = await body(
      request,
      z.object({
        phone: z.string().min(8).max(20),
        code: z.string().min(4).max(12),
      }),
    );
    const { phone } = await consumePhoneOtp({
      phone: data.phone,
      code: data.code,
      purpose: "VERIFY",
    });
    if (normalizePhone(data.phone) !== phone) {
      throw new AppError("Phone mismatch", 400);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { phone, phoneVerified: new Date() },
    });
    await sendSecurityAlert(
      user.id,
      "A phone number was verified on your Relune account.",
    );
    return ok({ ok: true, phone, phoneVerified: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await guardApiAbuse(request, "phone:unlink", 10);
    const user = await requireUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: null, phoneVerified: null },
    });
    await sendSecurityAlert(
      user.id,
      "The phone number was removed from your Relune account.",
    );
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
