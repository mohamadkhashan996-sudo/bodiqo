import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const taxSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().min(2).optional(),
  region: z.string().optional().nullable(),
  rate: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = taxSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const rate = await prisma.taxRate.update({
    where: { id },
    data: {
      ...data,
      country: data.country?.toUpperCase(),
      region: data.region === undefined ? undefined : data.region,
    },
  });
  return NextResponse.json({ rate: { ...rate, rate: String(rate.rate) } });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.taxRate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
