import { generateSecret, generateURI } from "otplib";
import { fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export async function POST() {
  try {
    const user = await requireUser();
    const secret = generateSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    return ok({ secret, otpauthUrl: generateURI({ issuer: "Cirqua", label: user.email ?? user.id, secret }) });
  } catch (e) {
    return fail(e);
  }
}
