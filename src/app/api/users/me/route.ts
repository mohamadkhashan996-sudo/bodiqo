import { z } from "zod";
import { ThemePreference } from "@prisma/client";
import { body, fail, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { isMediaUrl, optionalWebsiteSchema } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { assertHandleAvailable } from "@/modules/platform/reserved-handles";

const mediaOrClear = z
  .union([
    z.string().refine((v) => v === "" || isMediaUrl(v), {
      message: "Invalid media URL",
    }),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    return value;
  });

const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^@+/, ""))
  .pipe(z.string().regex(/^[a-z0-9_.]{3,24}$/, "Username must be 3–24 characters (a-z, 0-9, _ .)"));

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  displayName: z.string().trim().max(80).optional(),
  handle: handleSchema.optional(),
  bio: z.string().max(500).optional(),
  website: optionalWebsiteSchema,
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  image: mediaOrClear,
  coverImage: mediaOrClear,
  isPrivate: z.boolean().optional(),
  locale: z.string().max(12).optional(),
  theme: z.nativeEnum(ThemePreference).optional(),
});

const profileSelect = {
  id: true,
  email: true,
  name: true,
  displayName: true,
  handle: true,
  bio: true,
  website: true,
  city: true,
  country: true,
  image: true,
  coverImage: true,
  isPrivate: true,
  isVerified: true,
  isOfficial: true,
  locale: true,
  theme: true,
  onboardingDone: true,
  followersCount: true,
  followingCount: true,
  postsCount: true,
  createdAt: true,
  updatedAt: true,
  interests: { include: { interest: true } },
} as const;

export async function GET() {
  try {
    const u = await requireUser();
    return ok({
      user: await prisma.user.findUnique({
        where: { id: u.id },
        select: profileSelect,
      }),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(r: Request) {
  try {
    const u = await requireUser();
    const data = await body(r, schema);

    if (data.handle) {
      assertHandleAvailable(data.handle);
      const taken = await prisma.user.findFirst({
        where: { handle: data.handle, NOT: { id: u.id } },
        select: { id: true },
      });
      if (taken) throw new AppError("Username is already taken", 409);
    }

    const displayName = data.displayName ?? data.name;
    const user = await prisma.user.update({
      where: { id: u.id },
      data: {
        ...data,
        ...(displayName !== undefined
          ? { displayName, name: displayName }
          : {}),
      },
      select: profileSelect,
    });

    return ok({ user });
  } catch (e) {
    return fail(e);
  }
}
