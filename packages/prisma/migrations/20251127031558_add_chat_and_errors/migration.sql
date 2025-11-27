/*
  Warnings:

  - You are about to drop the column `error` on the `ChatMessage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "error",
ADD COLUMN     "isError" BOOLEAN NOT NULL DEFAULT false;
