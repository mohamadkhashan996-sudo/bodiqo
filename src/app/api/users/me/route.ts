import { ThemePreference } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { assertOwnedReadyAsset } from "@/lib/media-asset";
import { isMediaUrl, optionalWebsiteSchema } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { optionalHttpUrlSchema } from "@/lib/security";
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
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9_.]{3,24}$/,
        "Username must be 3–24 characters (a-z, 0-9, _ .)",
      ),
  );

const SOCIAL_KEYS = [
  "instagram",
  "x",
  "youtube",
  "tiktok",
  "linkedin",
  "github",
  "facebook",
] as const;

const socialLinksSchema = z
  .object({
    instagram: optionalHttpUrlSchema,
    x: optionalHttpUrlSchema,
    youtube: optionalHttpUrlSchema,
    tiktok: optionalHttpUrlSchema,
    linkedin: optionalHttpUrlSchema,
    github: optionalHttpUrlSchema,
    facebook: optionalHttpUrlSchema,
  })
  .partial()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const cleaned: Record<string, string> = {};
    for (const key of SOCIAL_KEYS) {
      const v = value[key];
      if (typeof v === "string" && v.length) cleaned[key] = v;
    }
    return cleaned;
  });

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  handle: handleSchema.optional(),
  bio: z.string().max(500).optional(),
  website: optionalWebsiteSchema,
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  languages: z.array(z.string().trim().min(2).max(32)).max(12).optional(),
  socialLinks: socialLinksSchema,
  image: mediaOrClear,
  coverImage: mediaOrClear,
  isPrivate: z.boolean().optional(),
  locale: z.string().max(12).optional(),
  theme: z.nativeEnum(ThemePreference).optional(),
  interestIds: z.array(z.string().cuid()).max(20).optional(),
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
  languages: true,
  socialLinks: true,
  image: true,
  coverImage: true,
  isPrivate: true,
  isVerified: true,
  isOfficial: true,
  twoFactorEnabled: true,
  locale: true,
  theme: true,
  onboardingDone: true,
  followersCount: true,
  followingCount: true,
  postsCount: true,
  videosCount: true,
  createdAt: true,
  updatedAt: true,
  interests: { include: { interest: true } },
} as const;

export async function GET() {
  try {
    const u = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: u.id },
      select: { ...profileSelect, passwordHash: true },
    });
    const { passwordHash, ...profile } = user ?? { passwordHash: null };
    return ok({
      user: user ? { ...profile, hasPassword: Boolean(passwordHash) } : null,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(r: Request) {
  try {
    await guardApiAbuse(r, "users:me:patch");
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

    try {
      if (data.image) {
        await assertOwnedReadyAsset(u.id, data.image, { kinds: ["IMAGE"] });
      }
      if (data.coverImage) {
        await assertOwnedReadyAsset(u.id, data.coverImage, {
          kinds: ["IMAGE", "GIF"],
        });
      }
    } catch (err) {
      throw new AppError(
        err instanceof Error ? err.message : "Invalid media",
        400,
      );
    }

    if (data.interestIds !== undefined) {
      const found = await prisma.interest.count({
        where: { id: { in: data.interestIds } },
      });
      if (found !== data.interestIds.length) {
        throw new AppError("One or more interests are invalid", 400);
      }
    }

    const displayName = data.displayName ?? data.name;
    const { interestIds, socialLinks, languages, ...profile } = data;

    const wasPrivate =
      data.isPrivate === false
        ? await prisma.user.findUnique({
            where: { id: u.id },
            select: { isPrivate: true },
          })
        : null;

    const user = await prisma.user.update({
      where: { id: u.id },
      data: {
        ...profile,
        ...(displayName !== undefined
          ? { displayName, name: displayName }
          : {}),
        ...(languages !== undefined
          ? {
              languages: [
                ...new Set(languages.map((l) => l.trim()).filter(Boolean)),
              ].slice(0, 12),
            }
          : {}),
        ...(socialLinks !== undefined ? { socialLinks } : {}),
        ...(interestIds !== undefined
          ? {
              interests: {
                deleteMany: {},
                create: interestIds.map((interestId) => ({ interestId })),
              },
            }
          : {}),
      },
      select: profileSelect,
    });

    // Going public: auto-approve pending follow requests as one-way follows.
    if (wasPrivate?.isPrivate && data.isPrivate === false) {
      const { acceptPendingFollowRequestsOnPublic } = await import(
        "@/modules/users/services/social"
      );
      await acceptPendingFollowRequestsOnPublic(u.id).catch(() => undefined);
    }

    return ok({ user });
  } catch (e) {
    return fail(e);
  }
}
