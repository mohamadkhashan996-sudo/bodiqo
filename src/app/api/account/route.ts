import { z } from "zod";
import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { bumpSessionVersion } from "@/modules/auth/security";
import { verifyPassword } from "@/modules/auth/password";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "account:export", 10);
    const user = await requireUser();
    const [profile, posts, comments, conversations] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          phone: true,
          handle: true,
          name: true,
          displayName: true,
          bio: true,
          website: true,
          country: true,
          city: true,
          locale: true,
          theme: true,
          createdAt: true,
          privacy: true,
        },
      }),
      prisma.post.findMany({
        where: { authorId: user.id, status: { not: "DELETED" } },
        select: {
          id: true,
          body: true,
          type: true,
          visibility: true,
          createdAt: true,
        },
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
      prisma.comment.findMany({
        where: { authorId: user.id, deletedAt: null },
        select: { id: true, body: true, postId: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
      prisma.conversationMember.findMany({
        where: { userId: user.id },
        select: { conversationId: true, joinedAt: true },
        take: 200,
      }),
    ]);

    return ok({
      exportedAt: new Date().toISOString(),
      profile,
      posts,
      comments,
      conversationIds: conversations.map((c) => c.conversationId),
    });
  } catch (e) {
    return fail(e);
  }
}

const actionSchema = z.object({
  action: z.enum(["deactivate", "delete"]),
  password: z.string().min(1).max(128).optional(),
  confirm: z.literal("DELETE").optional(),
});

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "account:lifecycle", 10);
    const sessionUser = await requireUser();
    const input = await body(request, actionSchema);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: sessionUser.id },
      select: { id: true, passwordHash: true, email: true, handle: true },
    });

    if (user.passwordHash) {
      if (!input.password) {
        throw new AppError("Password required", 400);
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) throw new AppError("Invalid password", 401);
    }

    if (input.action === "deactivate") {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "SUSPENDED", presence: "OFFLINE" },
      });
      await bumpSessionVersion(user.id);
      return ok({ status: "SUSPENDED" });
    }

    if (input.confirm !== "DELETE") {
      throw new AppError('Type confirm: "DELETE" to permanently delete', 400);
    }

    const stamp = Date.now();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        email: `deleted+${user.id}.${stamp}@relune.invalid`,
        phone: null,
        handle: `deleted_${stamp.toString(36)}`,
        name: "Deleted user",
        displayName: "Deleted user",
        bio: null,
        image: null,
        coverImage: null,
        passwordHash: null,
        presence: "OFFLINE",
      },
    });
    await bumpSessionVersion(user.id);
    return ok({ status: "DELETED" });
  } catch (e) {
    return fail(e);
  }
}
