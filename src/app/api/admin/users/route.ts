import { NextResponse } from "next/server";
import { assertAdmin, assertSuperAdmin } from "@/lib/assert-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const roleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["USER", "STAFF", "ADMIN"]),
});

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const admin = (await assertSuperAdmin()) ?? (await assertAdmin());
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = roleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { id, role } = parsed.data;
  if (role === "ADMIN" && admin.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only super admins can assign ADMIN role" },
      { status: 403 },
    );
  }

  if (id === admin.user.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Cannot demote your own admin access" },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ user });
}
