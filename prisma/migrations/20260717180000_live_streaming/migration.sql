-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LIVE_STARTED';
ALTER TYPE "NotificationType" ADD VALUE 'LIVE_GIFT';

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "status" "LiveStatus" NOT NULL DEFAULT 'LIVE',
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "giftCoins" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "mutedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveModerator" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveGiftCatalog" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "coinCost" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveGiftCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveGiftEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "coinCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveGiftEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveSession_status_startedAt_idx" ON "LiveSession"("status", "startedAt");
CREATE INDEX "LiveSession_hostId_status_idx" ON "LiveSession"("hostId", "status");
CREATE UNIQUE INDEX "LiveModerator_sessionId_userId_key" ON "LiveModerator"("sessionId", "userId");
CREATE INDEX "LiveModerator_userId_idx" ON "LiveModerator"("userId");
CREATE INDEX "LiveChatMessage_sessionId_createdAt_idx" ON "LiveChatMessage"("sessionId", "createdAt");
CREATE UNIQUE INDEX "LiveGiftCatalog_slug_key" ON "LiveGiftCatalog"("slug");
CREATE INDEX "LiveGiftEvent_sessionId_createdAt_idx" ON "LiveGiftEvent"("sessionId", "createdAt");
CREATE INDEX "LiveGiftEvent_hostId_createdAt_idx" ON "LiveGiftEvent"("hostId", "createdAt");
CREATE UNIQUE INDEX "LiveWallet_userId_key" ON "LiveWallet"("userId");

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "LiveGiftCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveGiftEvent" ADD CONSTRAINT "LiveGiftEvent_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveWallet" ADD CONSTRAINT "LiveWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed gift catalog
INSERT INTO "LiveGiftCatalog" ("id", "slug", "name", "emoji", "coinCost", "sortOrder", "isActive", "createdAt") VALUES
  ('livegift_rose', 'rose', 'Rose', '🌹', 1, 1, true, CURRENT_TIMESTAMP),
  ('livegift_clap', 'clap', 'Clap', '👏', 5, 2, true, CURRENT_TIMESTAMP),
  ('livegift_fire', 'fire', 'Fire', '🔥', 10, 3, true, CURRENT_TIMESTAMP),
  ('livegift_star', 'star', 'Star', '⭐', 25, 4, true, CURRENT_TIMESTAMP),
  ('livegift_diamond', 'diamond', 'Diamond', '💎', 50, 5, true, CURRENT_TIMESTAMP),
  ('livegift_crown', 'crown', 'Crown', '👑', 100, 6, true, CURRENT_TIMESTAMP),
  ('livegift_rocket', 'rocket', 'Rocket', '🚀', 200, 7, true, CURRENT_TIMESTAMP),
  ('livegift_universe', 'universe', 'Universe', '🌌', 500, 8, true, CURRENT_TIMESTAMP);
