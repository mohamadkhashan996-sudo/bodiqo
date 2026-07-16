import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { hashOpaque } from "@/modules/auth/password";
import { sendSms } from "@/modules/auth/sms";
import { normalizePhone } from "@/modules/auth/phone";
import { rateLimit } from "@/lib/rate-limit";

export type PhoneOtpPurpose = "LOGIN" | "VERIFY" | "REGISTER";

function otpCode() {
  return String(randomInt(100000, 999999));
}

export async function issuePhoneOtp(opts: {
  phone: string;
  purpose: PhoneOtpPurpose;
  userId?: string;
  ip?: string;
}) {
  const phone = normalizePhone(opts.phone);
  const ipLimit = await rateLimit(`sms:ip:${opts.ip ?? "anon"}`, 10, 60_000);
  const phoneLimit = await rateLimit(`sms:phone:${phone}`, 5, 60_000);
  if (!ipLimit.ok || !phoneLimit.ok) {
    throw new AppError("Too many SMS requests. Try again shortly.", 429);
  }

  const code = otpCode();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.phoneOtp.create({
    data: {
      phone,
      userId: opts.userId,
      purpose: opts.purpose,
      codeHash: hashOpaque(code),
      expiresAt,
    },
  });

  await sendSms(
    phone,
    `Your Relune code is ${code}. It expires in 10 minutes.`,
  );

  return {
    phone,
    expiresAt,
    ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
  };
}

export async function consumePhoneOtp(opts: {
  phone: string;
  purpose: PhoneOtpPurpose;
  code: string;
}) {
  const phone = normalizePhone(opts.phone);
  const row = await prisma.phoneOtp.findFirst({
    where: {
      phone,
      purpose: opts.purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new AppError("Invalid or expired code", 400);
  if (row.attempts >= 5) {
    throw new AppError("Too many attempts. Request a new code.", 429);
  }

  const ok = row.codeHash === hashOpaque(opts.code.trim());
  if (!ok) {
    await prisma.phoneOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError("Invalid or expired code", 400);
  }

  await prisma.phoneOtp.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { phone, userId: row.userId };
}
