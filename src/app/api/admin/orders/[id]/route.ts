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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const data: {
    status?: string;
    trackingNumber?: string;
    carrier?: string;
    shippedAt?: Date;
  } = {
    status: body.status,
    trackingNumber: body.trackingNumber || null,
    carrier: body.carrier || null,
  };
  if (body.status === "SHIPPED") {
    data.shippedAt = new Date();
  }
  const order = await prisma.order.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
  });
  return NextResponse.json({ order });
}
