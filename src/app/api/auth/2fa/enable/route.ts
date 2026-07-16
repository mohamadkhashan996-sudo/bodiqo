import { verify } from "otplib";
import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function POST(r: Request) {
  try {
    const user = await requireUser();
    const { code } = await body(
      r,
      z.object({ code: z.string().min(6).max(12) }),
    );
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true },
    });
    if (
      !current?.twoFactorSecret ||
      !(await verify({
        token: code,
        secret: current.twoFactorSecret,
      })).valid
    )
      return ok({ error: "Invalid code" }, 400);
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
