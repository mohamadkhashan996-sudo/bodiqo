-- Close remaining schema drift that broke User create (auth register).

-- Enums
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- User profile fields required by Prisma Client on every User write/read
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;

-- Post location metadata
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "locationName" TEXT;

-- PollVote.pollId (backfill from option → poll, then enforce NOT NULL)
ALTER TABLE "PollVote" ADD COLUMN IF NOT EXISTS "pollId" TEXT;
UPDATE "PollVote" pv
SET "pollId" = po."pollId"
FROM "PollOption" po
WHERE pv."optionId" = po."id" AND (pv."pollId" IS NULL OR pv."pollId" = '');
DELETE FROM "PollVote" WHERE "pollId" IS NULL;
ALTER TABLE "PollVote" ALTER COLUMN "pollId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "PollVote_pollId_idx" ON "PollVote"("pollId");
DO $$ BEGIN
  ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey"
    FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_userId_key" UNIQUE ("pollId", "userId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

-- Comment / post ranking indexes from schema
CREATE INDEX IF NOT EXISTS "Comment_postId_parentId_deletedAt_createdAt_idx"
  ON "Comment"("postId", "parentId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_postId_isPinned_likeCount_idx"
  ON "Comment"("postId", "isPinned", "likeCount");
CREATE INDEX IF NOT EXISTS "Comment_parentId_deletedAt_createdAt_idx"
  ON "Comment"("parentId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Post_status_deletedAt_publishedAt_idx"
  ON "Post"("status", "deletedAt", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_status_deletedAt_visibility_publishedAt_idx"
  ON "Post"("status", "deletedAt", "visibility", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_status_deletedAt_type_publishedAt_idx"
  ON "Post"("status", "deletedAt", "type", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_status_deletedAt_likeCount_idx"
  ON "Post"("status", "deletedAt", "likeCount");
