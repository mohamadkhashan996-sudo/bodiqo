import { ThemePreference } from "@prisma/client";
import { z } from "zod";
import { body, fail, ok, requireUser, guardApiAbuse} from "@/lib/api";
import { AppError } from "@/lib/errors";
import { optionalMediaUrlSchema } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { assertHandleAvailable } from "@/modules/platform/reserved-handles";
const schema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,24}$/)
    .optional(),
  displayName: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  image: optionalMediaUrlSchema,
  website: z.string().url().optional(),
  country: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  locale: z.string().max(12).optional(),
  theme: z.nativeEnum(ThemePreference).optional(),
  interestIds: z.array(z.string()).max(20).optional(),
});
export async function POST(r: Request) {
  try {
    await guardApiAbuse(r, "onboarding:post");
    const u = await requireUser();
    const d = await body(r, schema);
    if (d.handle) {
      assertHandleAvailable(d.handle);
      const existing = await prisma.user.findFirst({
        where: { handle: d.handle, NOT: { id: u.id } },
        select: { id: true },
      });
      if (existing) throw new AppError("Handle already in use", 409);
    }
    const { interestIds, ...profile } = d;
    await prisma.user.update({
      where: { id: u.id },
      data: {
        ...profile,
        onboardingDone: true,
        interests: interestIds
          ? {
              deleteMany: {},
              create: interestIds.map((interestId) => ({ interestId })),
            }
          : undefined,
      },
    });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
