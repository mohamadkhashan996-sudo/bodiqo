import {
  CommunityJoinStatus,
  CommunityRole,
  CommunityVisibility,
} from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/services/notify";

const ownerSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
} as const;

const memberUserSelect = {
  id: true,
  handle: true,
  name: true,
  displayName: true,
  image: true,
  presence: true,
} as const;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function listCommunities(userId: string) {
  const communities = await prisma.community.findMany({
    where: {
      OR: [
        { visibility: "PUBLIC" },
        {
          members: {
            some: { userId, status: { in: ["JOINED", "PENDING"] } },
          },
        },
        { ownerId: userId },
      ],
    },
    include: {
      members: {
        where: { userId },
        select: { status: true, role: true },
      },
      owner: { select: { handle: true, name: true, displayName: true } },
    },
    orderBy: { membersCount: "desc" },
    take: 80,
  });
  return { communities };
}

export async function createCommunity(
  userId: string,
  input: {
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    image?: string | null;
    coverImage?: string | null;
    rules?: string;
    visibility?: CommunityVisibility;
  },
) {
  const slug = slugify(input.slug || input.name);
  if (slug.length < 2) throw new AppError("Invalid slug", 400);
  const existing = await prisma.community.findUnique({ where: { slug } });
  if (existing) throw new AppError("That slug is already taken", 409);

  return prisma.community.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      image: input.image || null,
      coverImage: input.coverImage || null,
      rules: input.rules?.trim() || null,
      visibility: input.visibility ?? "PUBLIC",
      ownerId: userId,
      membersCount: 1,
      members: {
        create: { userId, role: "OWNER", status: "JOINED" },
      },
    },
    include: { members: true, owner: { select: ownerSelect } },
  });
}

export async function getCommunity(slug: string, viewerId?: string) {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      owner: { select: ownerSelect },
    },
  });
  if (!community) throw new AppError("Community not found", 404);

  const membership = viewerId
    ? await prisma.communityMember.findUnique({
        where: {
          communityId_userId: { communityId: community.id, userId: viewerId },
        },
      })
    : null;

  const isJoined = membership?.status === "JOINED";
  const isStaff =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.role === "MODERATOR";
  const canViewContent =
    community.visibility === "PUBLIC" ||
    isJoined ||
    community.ownerId === viewerId;

  if (!canViewContent) {
    return {
      community: {
        ...community,
        posts: [],
        members: [],
        locked: true,
      },
      membership,
      pendingCount: 0,
      canModerate: false,
    };
  }

  const [members, posts, pendingCount] = await Promise.all([
    prisma.communityMember.findMany({
      where: { communityId: community.id, status: "JOINED" },
      include: { user: { select: memberUserSelect } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take: 40,
    }),
    prisma.communityPost.findMany({
      where: { communityId: community.id },
      include: {
        author: { select: memberUserSelect },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    isStaff
      ? prisma.communityMember.count({
          where: { communityId: community.id, status: "PENDING" },
        })
      : Promise.resolve(0),
  ]);

  return {
    community: {
      ...community,
      members,
      posts,
      locked: false,
    },
    membership,
    pendingCount,
    canModerate: Boolean(isStaff),
  };
}

export async function updateCommunity(
  actorId: string,
  slug: string,
  data: {
    name?: string;
    description?: string | null;
    rules?: string | null;
    category?: string | null;
    visibility?: CommunityVisibility;
    image?: string | null;
    coverImage?: string | null;
  },
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);
  await assertCanModerate(actorId, community.id, ["OWNER", "ADMIN"]);

  return prisma.community.update({
    where: { id: community.id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.rules !== undefined
        ? { rules: data.rules?.trim() || null }
        : {}),
      ...(data.category !== undefined
        ? { category: data.category?.trim() || null }
        : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.image !== undefined ? { image: data.image } : {}),
      ...(data.coverImage !== undefined ? { coverImage: data.coverImage } : {}),
    },
  });
}

async function assertMember(userId: string, communityId: string) {
  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (!membership || membership.status === "BANNED") {
    throw new AppError("Not a member of this community", 403);
  }
  return membership;
}

async function assertCanModerate(
  userId: string,
  communityId: string,
  roles: CommunityRole[] = ["OWNER", "ADMIN", "MODERATOR"],
) {
  const membership = await assertMember(userId, communityId);
  if (membership.status !== "JOINED" || !roles.includes(membership.role)) {
    throw new AppError("Moderator access required", 403);
  }
  return membership;
}

export async function toggleMembership(userId: string, slug: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);

  const existing = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: { communityId: community.id, userId },
    },
  });

  if (existing?.status === "BANNED") {
    throw new AppError("You are banned from this community", 403);
  }

  if (existing?.status === "JOINED") {
    if (existing.role === "OWNER") {
      throw new AppError("Owners cannot leave. Transfer ownership first.", 400);
    }
    await prisma.$transaction([
      prisma.communityMember.delete({ where: { id: existing.id } }),
      prisma.community.update({
        where: { id: community.id },
        data: { membersCount: { decrement: 1 } },
      }),
    ]);
    return { joined: false, pending: false };
  }

  if (existing?.status === "PENDING") {
    await prisma.communityMember.delete({ where: { id: existing.id } });
    return { joined: false, pending: false, cancelled: true };
  }

  const status: CommunityJoinStatus =
    community.visibility === "PRIVATE" ? "PENDING" : "JOINED";

  await prisma.$transaction([
    prisma.communityMember.upsert({
      where: {
        communityId_userId: { communityId: community.id, userId },
      },
      create: { communityId: community.id, userId, status, role: "MEMBER" },
      update: { status, role: "MEMBER" },
    }),
    ...(status === "JOINED"
      ? [
          prisma.community.update({
            where: { id: community.id },
            data: { membersCount: { increment: 1 } },
          }),
        ]
      : []),
  ]);

  if (status === "PENDING") {
    const mods = await prisma.communityMember.findMany({
      where: {
        communityId: community.id,
        status: "JOINED",
        role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      },
      select: { userId: true },
    });
    await Promise.all(
      mods.map((mod) =>
        createNotification({
          userId: mod.userId,
          actorId: userId,
          type: "COMMUNITY_INVITE",
          body: `requested to join ${community.name}`,
          href: `/communities/${community.slug}`,
        }).catch(() => undefined),
      ),
    );
  }

  return { joined: status === "JOINED", pending: status === "PENDING" };
}

export async function listJoinRequests(actorId: string, slug: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);
  await assertCanModerate(actorId, community.id);

  const requests = await prisma.communityMember.findMany({
    where: { communityId: community.id, status: "PENDING" },
    include: { user: { select: memberUserSelect } },
    orderBy: { joinedAt: "asc" },
    take: 50,
  });
  return { requests };
}

export async function resolveJoinRequest(
  actorId: string,
  slug: string,
  memberId: string,
  action: "approve" | "reject",
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);
  await assertCanModerate(actorId, community.id);

  const request = await prisma.communityMember.findFirst({
    where: { id: memberId, communityId: community.id, status: "PENDING" },
  });
  if (!request) throw new AppError("Join request not found", 404);

  if (action === "reject") {
    await prisma.communityMember.delete({ where: { id: request.id } });
    return { ok: true, status: "REJECTED" as const };
  }

  await prisma.$transaction([
    prisma.communityMember.update({
      where: { id: request.id },
      data: { status: "JOINED", role: "MEMBER" },
    }),
    prisma.community.update({
      where: { id: community.id },
      data: { membersCount: { increment: 1 } },
    }),
  ]);

  await createNotification({
    userId: request.userId,
    actorId,
    type: "COMMUNITY_INVITE",
    body: `approved your request to join ${community.name}`,
    href: `/communities/${community.slug}`,
  }).catch(() => undefined);

  return { ok: true, status: "JOINED" as const };
}

export async function setMemberRole(
  actorId: string,
  slug: string,
  targetUserId: string,
  role: CommunityRole,
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);
  const actor = await assertCanModerate(actorId, community.id, [
    "OWNER",
    "ADMIN",
  ]);

  if (role === "OWNER") throw new AppError("Cannot assign OWNER this way", 400);
  if (targetUserId === community.ownerId) {
    throw new AppError("Cannot change the owner's role", 400);
  }

  const target = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: { communityId: community.id, userId: targetUserId },
    },
  });
  if (!target || target.status !== "JOINED") {
    throw new AppError("Member not found", 404);
  }
  if (target.role === "OWNER") {
    throw new AppError("Cannot change the owner's role", 400);
  }
  if (actor.role === "ADMIN" && target.role === "ADMIN") {
    throw new AppError("Admins cannot demote other admins", 403);
  }

  return prisma.communityMember.update({
    where: { id: target.id },
    data: { role },
    include: { user: { select: memberUserSelect } },
  });
}

export async function createCommunityPost(
  userId: string,
  slug: string,
  input: { body: string; mediaUrl?: string; isPinned?: boolean; isAnnouncement?: boolean },
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);
  const member = await assertMember(userId, community.id);
  if (member.status !== "JOINED") {
    throw new AppError("Join this community first", 403);
  }

  const canPin =
    member.role === "OWNER" ||
    member.role === "ADMIN" ||
    member.role === "MODERATOR";

  return prisma.$transaction(async (tx) => {
    const post = await tx.communityPost.create({
      data: {
        communityId: community.id,
        authorId: userId,
        body: input.body.trim(),
        mediaUrl: input.mediaUrl,
        isPinned: Boolean(canPin && input.isPinned),
        isAnnouncement: Boolean(canPin && input.isAnnouncement),
      },
      include: { author: { select: memberUserSelect } },
    });
    await tx.community.update({
      where: { id: community.id },
      data: { postsCount: { increment: 1 } },
    });
    return post;
  });
}

export async function deleteCommunityPost(
  actorId: string,
  slug: string,
  postId: string,
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new AppError("Community not found", 404);
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, communityId: community.id },
  });
  if (!post) throw new AppError("Post not found", 404);

  const member = await assertMember(actorId, community.id);
  const canModerate =
    member.status === "JOINED" &&
    ["OWNER", "ADMIN", "MODERATOR"].includes(member.role);
  if (post.authorId !== actorId && !canModerate) {
    throw new AppError("Forbidden", 403);
  }

  await prisma.$transaction([
    prisma.communityPost.delete({ where: { id: postId } }),
    prisma.community.update({
      where: { id: community.id },
      data: { postsCount: { decrement: 1 } },
    }),
  ]);
  return { ok: true };
}
