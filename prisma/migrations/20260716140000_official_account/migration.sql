-- Official Relune platform account flag
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOfficial" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_isOfficial_idx" ON "User"("isOfficial");
