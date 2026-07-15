import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) return { title: "Post not found" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });

  if (!post || !post.published) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Blog
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6] md:text-6xl">
        {post.title}
      </h1>
      {post.publishedAt ? (
        <p className="mt-4 text-xs tracking-[0.14em] text-[#f3efe6]/40 uppercase">
          {post.publishedAt.toLocaleDateString()}
        </p>
      ) : null}
      {post.coverImage ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-[#121212]">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      ) : null}
      <div
        className="prose prose-invert mt-10 max-w-none text-sm leading-7 text-[#f3efe6]/75 md:text-base"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
