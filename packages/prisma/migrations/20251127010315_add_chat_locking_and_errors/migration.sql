-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockReason" TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "error" TEXT;
