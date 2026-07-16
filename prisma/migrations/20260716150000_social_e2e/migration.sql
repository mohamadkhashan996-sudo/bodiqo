-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isEncrypted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "ciphertext" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "nonce" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "senderEphemeralKey" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserEncryptionKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEncryptionKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserEncryptionKey_userId_key" ON "UserEncryptionKey"("userId");

DO $$ BEGIN
 ALTER TABLE "UserEncryptionKey" ADD CONSTRAINT "UserEncryptionKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
