import { VerificationRequestStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "./audit";

export async function createVerificationRequest(
  userId: string,
  data: { fullName: string; category: string; evidenceUrls?: string[]; notes?: string },
) {
  const pending = await prisma.verificationRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "NEEDS_INFO"] } },
  });
  if (pending) throw new AppError("You already have an open verification request", 409);

  return prisma.verificationRequest.create({
    data: {
      userId,
      fullName: data.fullName,
      category: data.category,
      evidenceUrls: data.evidenceUrls ?? [],
      notes: data.notes,
    },
  });
}

export async function listVerificationRequests(opts: {
  status?: VerificationRequestStatus;
  take?: number;
}) {
  return prisma.verificationRequest.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? 40, 100),
    include: {
      user: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          image: true,
          isVerified: true,
        },
      },
    },
  });
}

export async function reviewVerification(
  actorId: string,
  requestId: string,
  action: "approve" | "reject" | "needs_info",
  adminNote?: string,
) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new AppError("Request not found", 404);

  const status: VerificationRequestStatus =
    action === "approve"
      ? "APPROVED"
      : action === "reject"
        ? "REJECTED"
        : "NEEDS_INFO";

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status,
        adminNote,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      },
    });
    if (action === "approve") {
      await tx.user.update({
        where: { id: request.userId },
        data: { isVerified: true },
      });
    }
    return row;
  });

  await writeAudit({
    actorId,
    action: `admin.verification.${action}`,
    target: requestId,
    meta: { userId: request.userId, adminNote },
  });
  return updated;
}
