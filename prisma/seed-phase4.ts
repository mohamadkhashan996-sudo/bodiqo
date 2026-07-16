import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("cirqua1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cirqua.local" },
    create: {
      email: "admin@cirqua.local",
      handle: "reluneops",
      name: "Relune Ops",
      displayName: "Relune Ops",
      passwordHash,
      emailVerified: new Date(),
      status: "ACTIVE",
      onboardingDone: true,
      role: "SUPER_ADMIN",
      isVerified: true,
      bio: "Platform operations",
    },
    update: {
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      onboardingDone: true,
      isVerified: true,
      handle: "reluneops",
      name: "Relune Ops",
      displayName: "Relune Ops",
    },
  });

  await prisma.user.updateMany({
    where: { email: "maya@cirqua.local" },
    data: { role: "ADMIN" },
  });

  await prisma.systemSetting.upsert({
    where: { key: "websiteName" },
    create: { key: "websiteName", value: "Relune", updatedBy: admin.id },
    update: { value: "Relune", updatedBy: admin.id },
  });

  await prisma.customRole.upsert({
    where: { name: "Trust Reviewer" },
    create: {
      name: "Trust Reviewer",
      description: "Review reports and verification queue",
      permissions: [
        "admin:access",
        "users:read",
        "reports:read",
        "reports:write",
        "verification:read",
        "verification:write",
        "content:read",
      ],
    },
    update: {},
  });

  const leo = await prisma.user.findUnique({ where: { email: "leo@cirqua.local" } });
  if (leo) {
    await prisma.report.create({
      data: {
        reporterId: leo.id,
        targetType: "USER",
        targetId: admin.id,
        reason: "Demo spam report",
        category: "SPAM",
        details: "Seeded for moderation center",
        status: "OPEN",
      },
    }).catch(() => undefined);

    await prisma.verificationRequest.create({
      data: {
        userId: leo.id,
        fullName: "Leo Martin",
        category: "Creator",
        notes: "Demo verification request",
        evidenceUrls: [],
        status: "PENDING",
      },
    }).catch(() => undefined);
  }

  await prisma.securityEvent.create({
    data: {
      type: "phase4.seed",
      severity: "info",
      actorId: admin.id,
      meta: { note: "Phase 4 seed completed" },
    },
  });

  console.log("Phase 4 seed complete.");
  console.log("Admin login: admin@cirqua.local / cirqua1234 (SUPER_ADMIN)");
  console.log("Maya is now ADMIN (re-login to refresh session role).");
}

main().finally(() => prisma.$disconnect());
