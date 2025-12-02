/*
  Warnings:

  - Added the required column `progress` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stage` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JobStage" AS ENUM ('transcribing', 'frame_analysis', 'embedding');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "progress" INTEGER NOT NULL,
ADD COLUMN     "stage" "JobStage" NOT NULL;
