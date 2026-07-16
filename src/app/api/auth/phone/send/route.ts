import { z } from "zod";
import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { issuePhoneOtp } from "@/modules/auth/phone-otp";
import { clientIp } from "@/lib/api";

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "phone:send", 15);
    const data = await body(
      request,
      z.object({
        phone: z.string().min(8).max(20),
        purpose: z.enum(["LOGIN", "VERIFY", "REGISTER"]).default("LOGIN"),
      }),
    );
    const result = await issuePhoneOtp({
      phone: data.phone,
      purpose: data.purpose,
      ip: clientIp(request),
    });
    return ok({
      ok: true,
      phone: result.phone,
      expiresAt: result.expiresAt,
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    });
  } catch (e) {
    return fail(e);
  }
}
