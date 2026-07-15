import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const taxSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(2),
  region: z.string().optional().nullable(),
  rate: z.number().min(0),
  enabled: z.boolean().default(true),
});

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rates = await prisma.taxRate.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    rates: rates.map((r) => ({ ...r, rate: String(r.rate) })),
  });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = taxSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const data = parsed.data;
  const rate = await prisma.taxRate.create({
    data: {
      name: data.name,
      country: data.country.toUpperCase(),
      region: data.region ?? null,
      rate: data.rate,
      enabled: data.enabled,
    },
  });
  return NextResponse.json({ rate: { ...rate, rate: String(rate.rate) } });
}
