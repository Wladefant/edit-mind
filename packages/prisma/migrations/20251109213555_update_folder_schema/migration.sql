/*
  Warnings:

  - The `size` column on the `Folder` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "size",
ADD COLUMN     "size" INTEGER;
