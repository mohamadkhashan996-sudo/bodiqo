import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Blog" };

export default async function BlogPage() {
  let posts: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    publishedAt: Date | null;
  }[] = [];

  try {
    posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
    });
  } catch {
    posts = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Journal
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6] md:text-6xl">
        Blog
      </h1>

      {posts.length === 0 ? (
        <p className="mt-10 text-sm text-[#f3efe6]/55">No posts published yet.</p>
      ) : (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/blog/${post.slug}`} className="block">
                {post.coverImage ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#121212]">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : null}
                <h2 className="mt-5 text-xl text-[#f3efe6] transition group-hover:text-[#4a8cff]">
                  {post.title}
                </h2>
                {post.excerpt ? (
                  <p className="mt-2 text-sm leading-relaxed text-[#f3efe6]/55">
                    {post.excerpt}
                  </p>
                ) : null}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
