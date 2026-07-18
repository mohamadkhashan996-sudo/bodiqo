import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/explore`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${base}/communities`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${base}/trending`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/sign-in`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/sign-up`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  try {
    const [profiles, posts, communities] = await Promise.all([
      prisma.user.findMany({
        where: { status: "ACTIVE", isPrivate: false, handle: { not: null } },
        select: { handle: true, updatedAt: true },
        orderBy: { followersCount: "desc" },
        take: 200,
      }),
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          deletedAt: null,
        },
        select: { id: true, updatedAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.community.findMany({
        where: { visibility: "PUBLIC" },
        select: { slug: true, updatedAt: true },
        orderBy: { membersCount: "desc" },
        take: 100,
      }),
    ]);

    return [
      ...staticRoutes,
      ...profiles
        .filter((u) => u.handle)
        .map((u) => ({
          url: `${base}/u/${u.handle}`,
          lastModified: u.updatedAt,
          changeFrequency: "daily" as const,
          priority: 0.65,
        })),
      ...posts.map((p) => ({
        url: `${base}/post/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      })),
      ...communities.map((c) => ({
        url: `${base}/communities/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
