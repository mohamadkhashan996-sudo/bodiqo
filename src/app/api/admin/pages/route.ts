import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().default(""),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  published: z.boolean().default(false),
});

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = pageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const page = await prisma.page.create({
    data: {
      title: data.title,
      slug: data.slug?.trim() || slugify(data.title),
      content: data.content,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      published: data.published,
    },
  });
  return NextResponse.json({ page });
}
