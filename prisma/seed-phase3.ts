import { PrismaClient } from "@prisma/client";

import { assertDemoSeedsAllowed } from "./seed-guard";

const prisma = new PrismaClient();

async function main() {
  assertDemoSeedsAllowed();
  const users = await Promise.all(
    ["maya", "leo", "sana"].map((handle) =>
      prisma.user.findUnique({ where: { handle } }),
    ),
  );
  if (users.some((user) => !user))
    throw new Error("Run db:seed:phase2 before db:seed:phase3.");
  const [maya, leo, sana] = users as [
    NonNullable<(typeof users)[number]>,
    NonNullable<(typeof users)[number]>,
    NonNullable<(typeof users)[number]>,
  ];

  await Promise.all(
    [maya, leo, sana].map((user) =>
      prisma.privacySettings.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      }),
    ),
  );
  let direct = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",
      members: { every: { userId: { in: [maya.id, leo.id] }, leftAt: null } },
      AND: [
        { members: { some: { userId: maya.id, leftAt: null } } },
        { members: { some: { userId: leo.id, leftAt: null } } },
      ],
    },
    include: { members: true },
  });
  if (!direct || direct.members.length !== 2) {
    direct = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        members: { create: [{ userId: maya.id }, { userId: leo.id }] },
      },
      include: { members: true },
    });
  }
  const messageCount = await prisma.message.count({
    where: { conversationId: direct.id },
  });
  if (!messageCount) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: direct.id,
          senderId: maya.id,
          body: "Hey Leo — how is the project going?",
        },
        {
          conversationId: direct.id,
          senderId: leo.id,
          body: "Really well! I am polishing the first release this week.",
        },
        {
          conversationId: direct.id,
          senderId: maya.id,
          body: "Amazing. Send me a preview when it is ready.",
        },
      ],
    });
    await prisma.conversation.update({
      where: { id: direct.id },
      data: { lastMessageAt: new Date() },
    });
  }

  const group = await prisma.conversation.upsert({
    where: { id: "demo-creative-group" },
    create: {
      id: "demo-creative-group",
      type: "GROUP",
      title: "Creative crew",
      description: "A small circle for sharing works in progress.",
      members: {
        create: [
          { userId: maya.id, role: "OWNER" },
          { userId: leo.id },
          { userId: sana.id },
        ],
      },
    },
    update: { title: "Creative crew" },
  });
  await Promise.all(
    [
      { userId: maya.id, role: "OWNER" },
      { userId: leo.id, role: "MEMBER" },
      { userId: sana.id, role: "MEMBER" },
    ].map(({ userId, role }) =>
      prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: group.id, userId } },
        create: { conversationId: group.id, userId, role },
        update: { leftAt: null },
      }),
    ),
  );

  const community = await prisma.community.upsert({
    where: { slug: "cirqua-creators" },
    create: {
      slug: "cirqua-creators",
      name: "Cirqua Creators",
      description: "A public home for people making thoughtful things.",
      visibility: "PUBLIC",
      ownerId: maya.id,
      membersCount: 3,
    },
    update: {
      description: "A public home for people making thoughtful things.",
      visibility: "PUBLIC",
      ownerId: maya.id,
      membersCount: 3,
    },
  });
  await Promise.all(
    [
      { userId: maya.id, role: "OWNER" as const },
      { userId: leo.id, role: "MEMBER" as const },
      { userId: sana.id, role: "MEMBER" as const },
    ].map(({ userId, role }) =>
      prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: community.id, userId } },
        create: { communityId: community.id, userId, role },
        update: { status: "JOINED" },
      }),
    ),
  );
  console.log("Phase 3 seed complete.");
}

main().finally(() => prisma.$disconnect());
