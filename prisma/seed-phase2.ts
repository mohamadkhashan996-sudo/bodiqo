import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { assertDemoSeedsAllowed } from "./seed-guard";

const prisma = new PrismaClient();

async function main() {
  assertDemoSeedsAllowed();
  const interests = [
    "Technology",
    "Design",
    "Music",
    "Photography",
    "Gaming",
    "Sports",
    "Travel",
    "Food",
    "Film",
    "Books",
    "Science",
    "Fitness",
  ];
  for (const name of interests) {
    await prisma.interest.upsert({
      where: { slug: name.toLowerCase() },
      create: { name, slug: name.toLowerCase() },
      update: { name },
    });
  }

  const passwordHash = await bcrypt.hash("cirqua1234", 12);
  const demoUsers = [
    {
      email: "maya@cirqua.local",
      handle: "maya",
      name: "Maya Chen",
      bio: "Designer, photographer, and curious human.",
    },
    {
      email: "leo@cirqua.local",
      handle: "leo",
      name: "Leo Martin",
      bio: "Building small things for the internet.",
    },
    {
      email: "sana@cirqua.local",
      handle: "sana",
      name: "Sana Patel",
      bio: "Stories, food, and weekend trails.",
    },
  ];
  const users = [];
  for (const user of demoUsers) {
    users.push(
      await prisma.user.upsert({
        where: { email: user.email },
        create: {
          ...user,
          displayName: user.name,
          passwordHash,
          emailVerified: new Date(),
          status: "ACTIVE",
          onboardingDone: true,
        },
        update: {
          ...user,
          passwordHash,
          emailVerified: new Date(),
          status: "ACTIVE",
          onboardingDone: true,
        },
      }),
    );
  }

  const maya = users[0];
  const leo = users[1];
  const sana = users[2];
  if (!maya || !leo || !sana) {
    throw new Error("Demo user seed failed");
  }
  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: leo.id, followingId: maya.id },
    },
    create: { followerId: leo.id, followingId: maya.id },
    update: {},
  });
  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: sana.id, followingId: maya.id },
    },
    create: { followerId: sana.id, followingId: maya.id },
    update: {},
  });
  await prisma.user.update({
    where: { id: maya.id },
    data: { followersCount: 2 },
  });

  const posts = await Promise.all([
    prisma.post.upsert({
      where: { id: "demo-maya-post" },
      create: {
        id: "demo-maya-post",
        authorId: maya.id,
        body: "Golden hour on the waterfront. #photography #design",
        publishedAt: new Date(),
        hashtags: {
          create: [
            {
              hashtag: {
                connectOrCreate: {
                  where: { tag: "photography" },
                  create: { tag: "photography", postCount: 1 },
                },
              },
            },
            {
              hashtag: {
                connectOrCreate: {
                  where: { tag: "design" },
                  create: { tag: "design", postCount: 1 },
                },
              },
            },
          ],
        },
      },
      update: {},
    }),
    prisma.post.upsert({
      where: { id: "demo-leo-post" },
      create: {
        id: "demo-leo-post",
        authorId: leo.id,
        body: "Shipping a tiny side project today. #technology",
        publishedAt: new Date(),
      },
      update: {},
    }),
    prisma.post.upsert({
      where: { id: "demo-sana-short" },
      create: {
        id: "demo-sana-short",
        authorId: sana.id,
        type: "SHORT",
        body: "A quiet trail before breakfast.",
        publishedAt: new Date(),
        media: {
          create: {
            kind: "VIDEO",
            url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          },
        },
      },
      update: {},
    }),
  ]);
  const mayaPost = posts[0];
  if (!mayaPost) throw new Error("Demo post seed failed");
  await Promise.all([
    prisma.story.upsert({
      where: { id: "demo-maya-story" },
      create: {
        id: "demo-maya-story",
        authorId: maya.id,
        mediaUrl:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
        textOverlay: "Hello, Cirqua!",
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      update: {
        expiresAt: new Date(Date.now() + 86_400_000),
        mediaUrl:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
      },
    }),
    prisma.comment.upsert({
      where: { id: "demo-comment" },
      create: {
        id: "demo-comment",
        postId: mayaPost.id,
        authorId: leo.id,
        body: "This light is incredible.",
      },
      update: {},
    }),
  ]);
  await prisma.user.update({
    where: { id: maya.id },
    data: { postsCount: 1, storiesCount: 1 },
  });
  await prisma.user.update({
    where: { id: leo.id },
    data: { postsCount: 1, followingCount: 1 },
  });
  await prisma.user.update({
    where: { id: sana.id },
    data: { postsCount: 1, videosCount: 1, followingCount: 1 },
  });
  console.log("Phase 2 seed complete.");
  console.log(
    "Demo logins (password cirqua1234): maya@cirqua.local, leo@cirqua.local, sana@cirqua.local",
  );
}

main().finally(() => prisma.$disconnect());
