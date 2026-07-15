import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session : null;
}

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    coupons: coupons.map((c) => ({
      ...c,
      value: String(c.value),
    })),
  });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const coupon = await prisma.coupon.create({
    data: {
      code: String(body.code).toUpperCase().trim(),
      type: body.type === "FIXED" ? "FIXED" : "PERCENTAGE",
      value: Number(body.value),
      enabled: true,
    },
  });
  return NextResponse.json({ coupon });
}
