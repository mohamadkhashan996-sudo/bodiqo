import type { Metadata } from "next";
import Link from "next/link";

import { MediaImage } from "@/components/ui/media-image";
import { site } from "@/config/site";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Embedded post",
    robots: { index: false, follow: false },
    alternates: { canonical: `/post/${id}` },
  };
}

export default async function EmbedPostPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: {
      id,
      deletedAt: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      author: { status: "ACTIVE", isPrivate: false },
    },
    select: {
      id: true,
      body: true,
      type: true,
      publishedAt: true,
      author: {
        select: {
          handle: true,
          displayName: true,
          name: true,
          image: true,
          isVerified: true,
        },
      },
      media: {
        select: { url: true, kind: true, thumbUrl: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  if (!post) {
    return (
      <main className="grid min-h-[320px] place-items-center bg-[var(--cloud)] p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            This post can’t be embedded
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            It may be private, removed, or unavailable.
          </p>
          <Link
            href={site.url}
            className="mt-4 inline-block text-xs font-semibold text-[var(--signal-deep)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Relune
          </Link>
        </div>
      </main>
    );
  }

  const author =
    post.author.displayName ||
    post.author.name ||
    (post.author.handle ? `@${post.author.handle}` : "Member");
  const media = post.media[0];
  const href = `${site.url.replace(/\/$/, "")}/post/${post.id}`;

  return (
    <main className="min-h-full bg-[var(--cloud)] p-3 text-[var(--ink)]">
      <article className="overflow-hidden rounded-[1.25rem] border-2 border-[var(--mist-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <header className="flex items-center gap-3 border-b-2 border-[var(--mist-strong)] px-4 py-3">
          {post.author.image ? (
            <MediaImage
              src={post.author.image}
              alt=""
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-[var(--mist)] text-xs font-bold">
              {author.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{author}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              on Relune
            </p>
          </div>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[11px] font-semibold text-[var(--signal-deep)]"
          >
            View
          </Link>
        </header>

        {post.body ? (
          <p className="px-4 py-3 text-sm leading-6 whitespace-pre-wrap">
            {post.body.length > 400 ? `${post.body.slice(0, 397)}…` : post.body}
          </p>
        ) : null}

        {media?.kind === "VIDEO" ? (
          <video
            src={media.url}
            poster={media.thumbUrl ?? undefined}
            controls
            playsInline
            className="max-h-80 w-full bg-[var(--night)] object-contain"
          />
        ) : media ? (
          <MediaImage
            src={media.url}
            alt="Post media"
            className="max-h-80 w-full object-cover"
          />
        ) : null}

        <footer className="flex items-center justify-between gap-3 border-t-2 border-[var(--mist-strong)] px-4 py-3">
          <span className="text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            Relune
          </span>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[var(--signal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Open post
          </Link>
        </footer>
      </article>
    </main>
  );
}
