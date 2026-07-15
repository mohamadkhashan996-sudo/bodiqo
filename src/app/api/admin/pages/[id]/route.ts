import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/catalog-types";
import { z } from "zod";

const pageSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  content: z.string().optional(),
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
  const parsed = pageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const page = await prisma.page.update({
    where: { id },
    data: {
      ...data,
      slug: data.slug?.trim() || (data.title ? slugify(data.title) : undefined),
      seoTitle: data.seoTitle === undefined ? undefined : data.seoTitle,
      seoDescription:
        data.seoDescription === undefined ? undefined : data.seoDescription,
    },
  });
  return NextResponse.json({ page });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
