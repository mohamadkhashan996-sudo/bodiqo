import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import PostPageClient from "./post-page-client";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null, status: "PUBLISHED", visibility: "PUBLIC" },
      select: {
        body: true,
        type: true,
        author: {
          select: { handle: true, displayName: true, name: true, image: true },
        },
        media: { select: { url: true, kind: true }, take: 1 },
      },
    });
    if (!post) {
      return { title: "Post", robots: { index: false } };
    }
    const author =
      post.author.displayName || post.author.name || post.author.handle || "Member";
    const excerpt = (post.body || `${post.type.toLowerCase()} post`).slice(0, 140);
    const title = `${author} on Relune`;
    const description = excerpt;
    const image = post.media[0]?.url;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: `${site.url}/post/${id}`,
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
      alternates: { canonical: `/post/${id}` },
    };
  } catch {
    return { title: "Post" };
  }
}

export default function PostPage() {
  return <PostPageClient />;
}
