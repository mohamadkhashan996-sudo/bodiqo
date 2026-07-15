import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

const blogSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional(),
  coverImage: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  published: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = blogSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const published = data.published ?? existing.published;
  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...data,
      slug: data.slug?.trim() || (data.title ? slugify(data.title) : undefined),
      excerpt: data.excerpt === undefined ? undefined : data.excerpt,
      coverImage: data.coverImage === undefined ? undefined : data.coverImage,
      seoTitle: data.seoTitle === undefined ? undefined : data.seoTitle,
      seoDescription:
        data.seoDescription === undefined ? undefined : data.seoDescription,
      publishedAt:
        published && !existing.publishedAt
          ? new Date()
          : published
            ? existing.publishedAt
            : null,
    },
  });
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
