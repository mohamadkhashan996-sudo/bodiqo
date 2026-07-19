import type { PostType, ReactionType } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import {
  OFFICIAL_BIO,
  OFFICIAL_EMAIL,
  OFFICIAL_USER_ID,
} from "../src/modules/platform/official-account";

const prisma = new PrismaClient();

const AVATAR = "/brand/official-avatar.svg";
const COVER = "/brand/official-cover.svg";
const THUMB =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
const THUMB_2 =
  "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80";
const VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type SeedPost = {
  id: string;
  type?: PostType;
  body: string;
  pinned?: boolean;
  media?: Array<{ kind: "IMAGE" | "VIDEO"; url: string }>;
};

const WELCOME: SeedPost[] = [
  {
    id: "official-welcome",
    pinned: true,
    body: `Welcome to Relune ✦

We're building one of the world's safest and most modern social platforms — designed for creators, protected by privacy-first engineering, and shaped by community trust.

Follow @relune for official announcements, safety updates, and new features.`,
    media: [{ kind: "IMAGE", url: THUMB }],
  },
  {
    id: "official-welcome-new-users",
    body: `New here? Start with three steps:

1. Complete your profile and choose interests
2. Follow creators and communities you love
3. Share your first post or Short

We're glad you joined Relune.`,
    media: [{ kind: "IMAGE", url: THUMB_2 }],
  },
  {
    id: "official-welcome-creators",
    body: `Creators — Relune is built for presence.

Use Creator Studio for drafts, scheduling, analytics, and live gifts. Your audience grows with quality, safety, and consistency.`,
  },
];

const FEATURES: SeedPost[] = [
  "Feed & For You — ranked posts tailored to your interests.",
  "Shorts — full-screen vertical video with seamless discovery.",
  "Stories & Highlights — ephemeral moments that can live on your profile.",
  "Messaging — realtime DMs and groups with reactions and media.",
  "Calls — voice and video calling built into Relune.",
  "Live — go live, chat with viewers, and receive gifts.",
  "Communities — public and private spaces with moderators.",
  "Search — find people, posts, hashtags, and communities in one place.",
  "Privacy controls — private accounts, close friends, mute, block, restrict.",
  "Verification — request a verified badge from Settings.",
  "Creator Studio — analytics, scheduler, videos, and monetization insights.",
  "Safety tools — report, block, and trust & safety review queues.",
].map((line, i) => ({
  id: `official-feature-${String(i + 1).padStart(2, "0")}`,
  body: `Feature spotlight — ${line}`,
  media: i % 2 === 0 ? [{ kind: "IMAGE" as const, url: THUMB }] : undefined,
}));

const ANNOUNCEMENTS: SeedPost[] = [
  "Relune is live — thank you for being early. Your feedback shapes what we ship next.",
  "Creator Studio is available from the app navigation for every creator.",
  "Live gifts and wallets are rolling out for livestream tipping.",
  "We've improved feed ranking for freshness and relevance.",
  "New admin tools strengthen moderation, reports, and platform health.",
  "Push notifications are smarter — control categories in Settings.",
  "Official announcements will always come from @relune. Beware of impersonators.",
  "We're investing in privacy-first defaults and transparent security.",
].map((body, i) => ({
  id: `official-announce-${String(i + 1).padStart(2, "0")}`,
  body: `Announcement — ${body}`,
  media: [{ kind: "IMAGE" as const, url: i % 2 ? THUMB_2 : THUMB }],
}));

const SAFETY: SeedPost[] = [
  "Community Guidelines — Be respectful. Protect privacy. No harassment, spam, scams, or impersonation.",
  "How to report — Open any post, profile, or message menu → Report. Choose a category and add details.",
  "Block & mute — Take control of your experience. Blocked users cannot interact with you.",
  "Private accounts — Approve followers before they see your posts.",
  "Two-factor authentication — Enable 2FA in Settings → Security for stronger account protection.",
  "Login alerts & devices — Review sessions and revoke anything unfamiliar.",
  "Copyright — Only post content you own or have rights to use. Report infringement via Copyright.",
  "Underage safety — Relune is built with age-appropriate protections and rapid escalation paths.",
  "Scam awareness — Relune staff never ask for your password or recovery codes.",
  "Crisis & harm — Report urgent safety issues immediately; our team prioritizes them.",
].map((body, i) => ({
  id: `official-safety-${String(i + 1).padStart(2, "0")}`,
  body,
}));

const CREATOR_TIPS: SeedPost[] = [
  "Tip — Post consistently. A weekly rhythm beats irregular bursts.",
  "Tip — Use Shorts for hooks, then deepen the story in your feed.",
  "Tip — Reply to comments early — it boosts conversation and trust.",
  "Tip — Write clear captions; accessibility helps discovery.",
  "Tip — Schedule drafts in Creator Studio when inspiration hits off-hours.",
  "Tip — Check analytics weekly: views, followers, and top posts.",
  "Tip — Collaborate with communities that share your niche.",
  "Tip — Keep thumbnails and cover images readable on mobile.",
  "Tip — Protect your brand: enable 2FA and review devices monthly.",
  "Tip — Live sessions with a clear title and cover convert viewers into followers.",
].map((body, i) => ({
  id: `official-tip-${String(i + 1).padStart(2, "0")}`,
  body,
}));

const SHORTS: SeedPost[] = Array.from({ length: 20 }, (_, i) => {
  const topics = [
    "How Relune Shorts work",
    "Privacy controls in 30 seconds",
    "Create your first post",
    "Enable 2FA for safety",
    "Explore Communities",
    "Go live with Relune",
    "Creator Studio tour",
    "Messaging tips",
    "Stories & Highlights",
    "Report & block tools",
    "Follow interests that fit you",
    "Search the network",
    "Save posts with bookmarks",
    "Close friends circle",
    "Official vs verified badges",
    "Live gifts explained",
    "Schedule a post",
    "Feed modes: Following & For You",
    "Profile setup checklist",
    "Welcome to Relune Shorts",
  ];
  return {
    id: `official-short-${String(i + 1).padStart(2, "0")}`,
    type: "SHORT" as const,
    body: `${topics[i]} — a quick Relune feature guide.`,
    media: [{ kind: "VIDEO" as const, url: VIDEO }],
  };
});

function fillToFifty(base: SeedPost[]): SeedPost[] {
  const extras: SeedPost[] = [];
  let n = 1;
  while (base.length + extras.length < 50) {
    extras.push({
      id: `official-extra-${String(n).padStart(2, "0")}`,
      body: `Relune update #${n} — Building a safer, more creative social home for everyone. Follow @relune for the latest.`,
      media: n % 3 === 0 ? [{ kind: "IMAGE", url: THUMB }] : undefined,
    });
    n += 1;
  }
  return [...base, ...extras].slice(0, 50);
}

const TEXT_POSTS = fillToFifty([
  ...WELCOME,
  ...FEATURES,
  ...ANNOUNCEMENTS,
  ...SAFETY,
  ...CREATOR_TIPS,
]);

const ALL_POSTS: SeedPost[] = [...TEXT_POSTS, ...SHORTS];

const ENGAGER_HANDLES = ["maya", "leo", "sana"] as const;

async function ensureEngagers() {
  const users = await prisma.user.findMany({
    where: { handle: { in: [...ENGAGER_HANDLES] } },
    select: { id: true, handle: true },
  });
  return users;
}

async function seedEngagement(
  officialId: string,
  postIds: string[],
  engagers: Array<{ id: string }>,
) {
  if (!engagers.length || !postIds.length) return;

  const reactions: ReactionType[] = ["LIKE", "LOVE", "WOW"];
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let views = 0;

  for (let i = 0; i < postIds.length; i++) {
    const postId = postIds[i]!;
    const viewers = engagers.slice(0, 1 + (i % engagers.length));
    for (const [vi, engager] of viewers.entries()) {
      await prisma.postView.upsert({
        where: {
          postId_viewerId: { postId, viewerId: engager.id },
        },
        create: {
          postId,
          viewerId: engager.id,
          dwellMs: 3_000 + vi * 1_500,
          completed: vi === 0,
        },
        update: { dwellMs: 3_000 + vi * 1_500 },
      });
      views += 1;

      if (i % 2 === vi % 2) {
        await prisma.postLike.upsert({
          where: {
            postId_userId: { postId, userId: engager.id },
          },
          create: {
            postId,
            userId: engager.id,
            type: reactions[(i + vi) % reactions.length]!,
          },
          update: {},
        });
        likes += 1;
      }

      if (i % 3 === vi) {
        const commentId = `official-eng-c-${postId}-${engager.id}`;
        await prisma.comment.upsert({
          where: { id: commentId },
          create: {
            id: commentId,
            postId,
            authorId: engager.id,
            body:
              i % 5 === 0
                ? "Love this update from Relune ✨"
                : i % 5 === 1
                  ? "Clear and helpful — thank you @relune"
                  : "Excited for what's next!",
          },
          update: { deletedAt: null },
        });
        comments += 1;
      }

      if (i % 4 === 0 && vi === 0) {
        const shareId = `official-eng-s-${postId}-${engager.id}`;
        const existingShare = await prisma.postShare.findUnique({
          where: { id: shareId },
        });
        if (!existingShare) {
          await prisma.postShare.create({
            data: {
              id: shareId,
              postId,
              userId: engager.id,
              channel: "INTERNAL",
            },
          });
          shares += 1;
        }
      }
    }

    const likeCount = await prisma.postLike.count({ where: { postId } });
    const commentCount = await prisma.comment.count({
      where: { postId, deletedAt: null },
    });
    const shareCount = await prisma.postShare.count({ where: { postId } });
    const viewCount = await prisma.postView.count({ where: { postId } });
    await prisma.post.update({
      where: { id: postId },
      data: { likeCount, commentCount, shareCount, viewCount },
    });
  }

  for (const engager of engagers) {
    await prisma.follow
      .upsert({
        where: {
          followerId_followingId: {
            followerId: engager.id,
            followingId: officialId,
          },
        },
        create: {
          followerId: engager.id,
          followingId: officialId,
        },
        update: {},
      })
      .catch(() => undefined);
  }

  const followersCount = await prisma.follow.count({
    where: { followingId: officialId },
  });
  await prisma.user.update({
    where: { id: officialId },
    data: { followersCount },
  });

  return { likes, comments, shares, views, followersCount };
}

async function main() {
  const official = await prisma.user.upsert({
    where: { id: OFFICIAL_USER_ID },
    create: {
      id: OFFICIAL_USER_ID,
      email: OFFICIAL_EMAIL,
      handle: "relune",
      name: "Relune",
      displayName: "Relune",
      bio: OFFICIAL_BIO,
      image: AVATAR,
      coverImage: COVER,
      passwordHash: null,
      phone: null,
      emailVerified: new Date(),
      status: "ACTIVE",
      onboardingDone: true,
      isVerified: true,
      isOfficial: true,
      isPrivate: false,
      role: "USER",
      website: "https://relune.app",
      country: "Global",
    },
    update: {
      email: OFFICIAL_EMAIL,
      handle: "relune",
      name: "Relune",
      displayName: "Relune",
      bio: OFFICIAL_BIO,
      image: AVATAR,
      coverImage: COVER,
      passwordHash: null,
      phone: null,
      emailVerified: new Date(),
      status: "ACTIVE",
      onboardingDone: true,
      isVerified: true,
      isOfficial: true,
      isPrivate: false,
      role: "USER",
      website: "https://relune.app",
    },
  });

  await prisma.post.updateMany({
    where: { authorId: official.id, isPinned: true },
    data: { isPinned: false },
  });

  const keepIds = ALL_POSTS.map((p) => p.id);
  await prisma.post.deleteMany({
    where: {
      authorId: official.id,
      id: { notIn: keepIds },
    },
  });

  let postCount = 0;
  let videoCount = 0;
  const postIds: string[] = [];

  for (const item of ALL_POSTS) {
    await prisma.post.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        authorId: official.id,
        type: item.type ?? "TEXT",
        body: item.body,
        visibility: "PUBLIC",
        status: "PUBLISHED",
        publishedAt: new Date(),
        isPinned: Boolean(item.pinned),
        media: item.media
          ? {
              create: item.media.map((m, sortOrder) => ({
                kind: m.kind,
                url: m.url,
                sortOrder,
              })),
            }
          : undefined,
      },
      update: {
        body: item.body,
        type: item.type ?? "TEXT",
        isPinned: Boolean(item.pinned),
        status: "PUBLISHED",
        deletedAt: null,
        visibility: "PUBLIC",
      },
    });
    postIds.push(item.id);
    postCount += 1;
    if (item.type === "VIDEO" || item.type === "SHORT") videoCount += 1;
  }

  await prisma.user.update({
    where: { id: official.id },
    data: { postsCount: postCount, videosCount: videoCount },
  });

  await prisma.systemSetting.upsert({
    where: { key: "officialAccountId" },
    create: {
      key: "officialAccountId",
      value: official.id,
      updatedBy: official.id,
    },
    update: { value: official.id, updatedBy: official.id },
  });

  const engagers = await ensureEngagers();
  const engagement = await seedEngagement(official.id, postIds, engagers);

  console.log("Official Relune account ready (passwordless).");
  console.log(`Profile: /u/relune`);
  console.log(`Email sentinel (not for login): ${OFFICIAL_EMAIL}`);
  console.log(`Posts: ${postCount} · Shorts/videos: ${videoCount}`);
  console.log(`Pinned: official-welcome`);
  console.log(
    engagement
      ? `Engagement seeded via ${engagers.length} demo accounts · followers ${engagement.followersCount}`
      : "Engagement skipped (no demo engagers — run db:seed:phase2)",
  );
  console.log(
    "Access: Super Admin Dashboard → Open Official Relune Account",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
