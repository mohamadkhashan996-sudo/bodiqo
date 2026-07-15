import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  slug: string;
  title: string;
};

export default async function PolicyPage({ slug, title }: Props) {
  let page: { title: string; content: string } | null = null;

  try {
    const full = await prisma.page.findUnique({ where: { slug } });
    if (full?.published) {
      page = { title: full.title, content: full.content };
    }
  } catch {
    page = null;
  }

  return (
    <article className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6] md:text-6xl">
        {page?.title || title}
      </h1>
      {page ? (
        <div
          className="prose prose-invert mt-10 max-w-none text-sm leading-7 text-[#f3efe6]/75 md:text-base"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        <div className="mt-10 space-y-4 text-sm leading-7 text-[#f3efe6]/65">
          <p>
            This policy page has not been published yet. Check back soon or
            contact support.
          </p>
          <p>
            Admin: create a published page with slug{" "}
            <code className="text-[#4a8cff]">{slug}</code> in{" "}
            <Link href="/admin/pages" className="text-[#4a8cff]">
              Pages
            </Link>
            .
          </p>
        </div>
      )}
    </article>
  );
}
