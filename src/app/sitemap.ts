import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getProducts } from "@/lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticRoutes = [
    "",
    "/shop",
    "/categories",
    "/blog",
    "/about",
    "/contact",
    "/faq",
    "/wishlist",
    "/track-order",
    "/privacy",
    "/terms",
    "/refund",
    "/shipping-policy",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const products = await getProducts();
  const productRoutes = products.map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  let blogRoutes: MetadataRoute.Sitemap = [];
  let pageRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    blogRoutes = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
    const pages = await prisma.page.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    pageRoutes = pages.map((p) => ({
      url: `${base}/pages/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch {
    // DB optional at build time
  }

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...pageRoutes];
}
