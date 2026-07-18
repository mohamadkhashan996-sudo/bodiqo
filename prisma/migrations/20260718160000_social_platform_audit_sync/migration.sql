-- Sync schema drift from social-platform audit remediations
-- (friends, messaging requests, notifications prefs, watch history,
--  collections/shares, live moderation pin/block, ranking indexes).

-- Enums (idempotent for DBs that already received these via `db push`)
DO $$ BEGIN
  CREATE TYPE "FriendRequestKind" AS ENUM ('FOLLOW', 'FRIEND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ShareChannel" AS ENUM ('COPY', 'NATIVE', 'WHATSAPP', 'TELEGRAM', 'FACEBOOK', 'X', 'EMAIL', 'LINKEDIN', 'QR', 'EMBED', 'INTERNAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CollectionVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';

-- Reaction columns (PostLike / CommentLike previously had no type)
ALTER TABLE "PostLike" ADD COLUMN IF NOT EXISTS "type" "ReactionType" NOT NULL DEFAULT 'LIKE';
ALTER TABLE "PostLike" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "PostLike_postId_type_idx" ON "PostLike"("postId", "type");

ALTER TABLE "CommentLike" ADD COLUMN IF NOT EXISTS "type" "ReactionType" NOT NULL DEFAULT 'LIKE';
ALTER TABLE "CommentLike" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "CommentLike_userId_createdAt_idx" ON "CommentLike"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommentLike_commentId_type_idx" ON "CommentLike"("commentId", "type");

ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mediaKind" "MediaKind";

-- Friend requests + close friends
ALTER TABLE "FriendRequest" ADD COLUMN IF NOT EXISTS "kind" "FriendRequestKind" NOT NULL DEFAULT 'FOLLOW';
CREATE INDEX IF NOT EXISTS "FriendRequest_fromUserId_status_idx" ON "FriendRequest"("fromUserId", "status");
CREATE INDEX IF NOT EXISTS "FriendRequest_fromUserId_toUserId_status_updatedAt_idx" ON "FriendRequest"("fromUserId", "toUserId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "FriendRequest_kind_status_createdAt_idx" ON "FriendRequest"("kind", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "CloseFriend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CloseFriend_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CloseFriend_userId_friendId_key" ON "CloseFriend"("userId", "friendId");
CREATE INDEX IF NOT EXISTS "CloseFriend_userId_createdAt_idx" ON "CloseFriend"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CloseFriend_friendId_idx" ON "CloseFriend"("friendId");
DO $$ BEGIN
  ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Watch / impression history
CREATE TABLE IF NOT EXISTS "PostView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "dwellMs" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostView_postId_viewerId_key" ON "PostView"("postId", "viewerId");
CREATE INDEX IF NOT EXISTS "PostView_viewerId_createdAt_idx" ON "PostView"("viewerId", "createdAt");
CREATE INDEX IF NOT EXISTS "PostView_postId_createdAt_idx" ON "PostView"("postId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PostView" ADD CONSTRAINT "PostView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bookmark polish + collections
ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "Bookmark_userId_updatedAt_idx" ON "Bookmark"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "BookmarkCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "CollectionVisibility" NOT NULL DEFAULT 'PRIVATE',
    "coverUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookmarkCollection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BookmarkCollection_userId_sortOrder_idx" ON "BookmarkCollection"("userId", "sortOrder");
CREATE INDEX IF NOT EXISTS "BookmarkCollection_userId_createdAt_idx" ON "BookmarkCollection"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BookmarkCollection_visibility_createdAt_idx" ON "BookmarkCollection"("visibility", "createdAt");
DO $$ BEGIN
  ALTER TABLE "BookmarkCollection" ADD CONSTRAINT "BookmarkCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "BookmarkCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookmarkCollectionItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BookmarkCollectionItem_collectionId_postId_key" ON "BookmarkCollectionItem"("collectionId", "postId");
CREATE INDEX IF NOT EXISTS "BookmarkCollectionItem_postId_idx" ON "BookmarkCollectionItem"("postId");
CREATE INDEX IF NOT EXISTS "BookmarkCollectionItem_collectionId_sortOrder_idx" ON "BookmarkCollectionItem"("collectionId", "sortOrder");
DO $$ BEGIN
  ALTER TABLE "BookmarkCollectionItem" ADD CONSTRAINT "BookmarkCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "BookmarkCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BookmarkCollectionItem" ADD CONSTRAINT "BookmarkCollectionItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Share events
CREATE TABLE IF NOT EXISTS "PostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "ShareChannel" NOT NULL DEFAULT 'OTHER',
    "targetUserId" TEXT,
    "counted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PostShare_postId_createdAt_idx" ON "PostShare"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "PostShare_userId_postId_createdAt_idx" ON "PostShare"("userId", "postId", "createdAt");
CREATE INDEX IF NOT EXISTS "PostShare_channel_createdAt_idx" ON "PostShare"("channel", "createdAt");
CREATE INDEX IF NOT EXISTS "PostShare_postId_userId_channel_idx" ON "PostShare"("postId", "userId", "channel");
DO $$ BEGIN
  ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification preferences + indexes
CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "social" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "calls" BOOLEAN NOT NULL DEFAULT true,
    "live" BOOLEAN NOT NULL DEFAULT true,
    "community" BOOLEAN NOT NULL DEFAULT true,
    "product" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hideMessagePreview" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");
DO $$ BEGIN
  ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_type_postId_actorId_readAt_idx" ON "Notification"("userId", "type", "postId", "actorId", "readAt");

-- Messaging request flag
ALTER TABLE "ConversationMember" ADD COLUMN IF NOT EXISTS "isRequest" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "ConversationMember_userId_isRequest_lastReadAt_idx" ON "ConversationMember"("userId", "isRequest", "lastReadAt");

-- Privacy: friends list audience
ALTER TABLE "PrivacySettings" ADD COLUMN IF NOT EXISTS "whoCanSeeFriends" "PrivacyAudience" NOT NULL DEFAULT 'FOLLOWERS';

-- Live moderation pin/block
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "blockedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "pinnedMessageId" TEXT;
ALTER TABLE "LiveChatMessage" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "LiveChatMessage_sessionId_isPinned_idx" ON "LiveChatMessage"("sessionId", "isPinned");

-- Post reaction aggregate + feed / search indexes
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "reactionCounts" JSONB;
CREATE INDEX IF NOT EXISTS "Post_status_deletedAt_visibility_publishedAt_likeCount_idx" ON "Post"("status", "deletedAt", "visibility", "publishedAt", "likeCount");
CREATE INDEX IF NOT EXISTS "Post_authorId_status_publishedAt_idx" ON "Post"("authorId", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "SearchHistory_userId_query_idx" ON "SearchHistory"("userId", "query");
CREATE INDEX IF NOT EXISTS "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");
