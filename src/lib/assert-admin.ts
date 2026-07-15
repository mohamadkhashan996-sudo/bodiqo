import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = new Set(["ADMIN", "STAFF"]);

export async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true },
  });
  if (!user || !ADMIN_ROLES.has(user.role)) return null;
  return { session, user };
}

/** Backward-compatible helper used by older admin API routes. */
export async function assertAdminApi() {
  const result = await assertAdmin();
  return result?.session ?? null;
}

export async function assertSuperAdmin() {
  const result = await assertAdmin();
  if (!result || result.user.role !== "ADMIN") return null;
  return result;
}
