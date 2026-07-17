-- EmailToken → User FK
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "EmailToken_userId_idx" ON "EmailToken"("userId");

-- Block / Mute reverse lookup indexes
CREATE INDEX IF NOT EXISTS "Block_blockedId_idx" ON "Block"("blockedId");
CREATE INDEX IF NOT EXISTS "Block_blockerId_createdAt_idx" ON "Block"("blockerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Mute_mutedId_idx" ON "Mute"("mutedId");
CREATE INDEX IF NOT EXISTS "Mute_muterId_createdAt_idx" ON "Mute"("muterId", "createdAt");

-- CommunityPost → User FK
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- Drop unused CommunityEvent orphan table
DROP TABLE IF EXISTS "CommunityEvent";
