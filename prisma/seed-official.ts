import type { PostType } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

import { hashPassword } from "../src/modules/auth/password";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_USER_ID,
} from "../src/modules/platform/official-account";

const prisma = new PrismaClient();

function resolveOfficialPassword(): { password: string; generated: boolean } {
  const fromEnv = process.env.OFFICIAL_ACCOUNT_PASSWORD?.trim();
  if (fromEnv) {
    if (fromEnv.length < 12) {
      throw new Error(
        "OFFICIAL_ACCOUNT_PASSWORD must be at least 12 characters",
      );
    }
    return { password: fromEnv, generated: false };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set OFFICIAL_ACCOUNT_PASSWORD before seeding the official account in production",
    );
  }
  // Local/dev only: random password, printed once — never hardcoded.
  const password = `Relune!${randomBytes(12).toString("hex")}A1`;
  return { password, generated: true };
}

const AVATAR = "/brand/official-avatar.svg";
const COVER = "/brand/official-cover.svg";
const THUMB =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
const WELCOME_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const BIO = `Welcome to the official Relune account.
The official home of Relune.
Building one of the world's safest and most modern social platforms.
Privacy First.
Security First.
Creators First.
Follow this account for official announcements, new features, safety updates, platform news and community events.`;

type SeedPost = {
  id: string;
  type?: PostType;
  body: string;
  pinned?: boolean;
  media?: Array<{ kind: "IMAGE" | "VIDEO"; url: string }>;
};

const POSTS: SeedPost[] = [
  {
    id: "official-welcome",
    pinned: true,
    body: `Welcome to Relune ✦

We're building one of the world's safest and most modern social platforms — designed for creators, protected by privacy-first engineering, and shaped by community trust.

Follow @relune for official announcements, safety updates, and new features.`,
    media: [{ kind: "IMAGE", url: THUMB }],
  },
  {
    id: "official-welcome-video",
    type: "VIDEO",
    body: "Welcome to Relune — a cinematic home for your presence. This is where your story begins.",
    media: [{ kind: "VIDEO", url: WELCOME_VIDEO }],
  },
  {
    id: "official-welcome-reel",
    type: "SHORT",
    body: "Your world. Your pace. Welcome to Relune Shorts.",
    media: [{ kind: "VIDEO", url: WELCOME_VIDEO }],
  },
  {
    id: "official-intro",
    body: "Platform Introduction — Relune brings together feed, shorts, communities, messaging, and stories in one elegant experience built for trust and creativity.",
    media: [{ kind: "IMAGE", url: THUMB }],
  },
  {
    id: "official-guidelines",
    body: "Community Guidelines — Be respectful. Protect privacy. No harassment, spam, or impersonation. We review reports quickly and act fairly.",
  },
  {
    id: "official-privacy",
    body: "Privacy & Security — Your data belongs to you. Relune uses encryption, secure sessions, 2FA, and transparent controls so you decide what you share.",
  },
  {
    id: "official-safety",
    body: "Safety Center — Block, mute, restrict, and report tools are always one tap away. Our trust team reviews high-priority reports around the clock.",
  },
  {
    id: "official-protect",
    body: "How Relune protects your account — Rate limiting, device management, login alerts, session revoke, and optional two-factor authentication keep you in control.",
  },
  {
    id: "official-report",
    body: "How to report abuse — Open any profile, post, or message menu → Report. Choose a category, add details, and submit. Urgent safety issues are escalated immediately.",
  },
  {
    id: "official-getting-started",
    body: "Getting Started — Create your account, personalize your profile, follow creators, explore Shorts, and join communities that match your interests.",
    media: [{ kind: "IMAGE", url: THUMB }],
  },
  {
    id: "official-features",
    body: "Feature Showcase — Infinite feed, Shorts autoplay, guest browsing, official announcements, rich messaging, calls, stories, and professional privacy controls.",
    media: [{ kind: "IMAGE", url: THUMB }],
  },
  {
    id: "official-roadmap",
    body: "Future Roadmap — Live events, creator monetization, advanced recommendations, family pairing, and deeper safety automation are on the way.",
  },
  {
    id: "official-new-members",
    body: "Welcome to every new member joining Relune today. We're glad you're here — explore freely, create boldly, and reach out if you need help.",
  },
];

async function main() {
  const { password: officialPassword, generated } = resolveOfficialPassword();
  const passwordHash = await hashPassword(officialPassword);

  const official = await prisma.user.upsert({
    where: { id: OFFICIAL_USER_ID },
    create: {
      id: OFFICIAL_USER_ID,
      email: OFFICIAL_EMAIL,
      handle: "relune",
      name: "Relune",
      displayName: "Relune",
      bio: BIO,
      image: AVATAR,
      coverImage: COVER,
      passwordHash,
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
      bio: BIO,
      image: AVATAR,
      coverImage: COVER,
      passwordHash,
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

  let postCount = 0;
  let videoCount = 0;

  for (const item of POSTS) {
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
      },
    });
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

  console.log("Official Relune account ready.");
  console.log(`Profile: http://localhost:3000/u/relune`);
  console.log(`Email:   ${OFFICIAL_EMAIL}`);
  if (generated) {
    console.log(`Password (dev, save now): ${officialPassword}`);
  } else {
    console.log("Password: set via OFFICIAL_ACCOUNT_PASSWORD (not printed).");
  }
  console.log(
    `Posts:   ${postCount} (${POSTS.find((p) => p.pinned)?.id} pinned)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
