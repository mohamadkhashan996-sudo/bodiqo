import { z } from "zod";
import { body, fail, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
const schema = z.object({
  name: z.string().max(80).optional(),
  displayName: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  image: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
  locale: z.string().max(12).optional(),
});
export async function GET() {
  try {
    const u = await requireUser();
    return ok({
      user: await prisma.user.findUnique({
        where: { id: u.id },
        include: { interests: { include: { interest: true } } },
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(r: Request) {
  try {
    const u = await requireUser();
    return ok({
      user: await prisma.user.update({
        where: { id: u.id },
        data: await body(r, schema),
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
