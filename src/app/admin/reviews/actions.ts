"use server";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function approveReview(id: string, approved: boolean) {
  try {
    await requireAdmin();
    await prisma.review.update({ where: { id }, data: { approved } });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Unauthorized or failed" };
  }
}

export async function deleteReview(id: string) {
  try {
    await requireAdmin();
    await prisma.review.delete({ where: { id } });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Unauthorized or failed" };
  }
}
