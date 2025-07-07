/*
  Warnings:

  - Added the required column `lastSpin` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastSpin",
ADD COLUMN     "lastSpin" BIGINT NOT NULL;
