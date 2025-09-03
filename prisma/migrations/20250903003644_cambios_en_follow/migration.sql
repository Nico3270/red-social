/*
  Warnings:

  - You are about to drop the column `followedId` on the `Follow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[followerId,followedUserId]` on the table `Follow` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[followerId,followedBusinessId]` on the table `Follow` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Follow" DROP CONSTRAINT "fk_follow_followed_business";

-- DropForeignKey
ALTER TABLE "public"."Follow" DROP CONSTRAINT "fk_follow_followed_user";

-- DropIndex
DROP INDEX "public"."Follow_followedId_type_idx";

-- DropIndex
DROP INDEX "public"."Follow_followerId_followedId_key";

-- AlterTable
ALTER TABLE "public"."Follow" DROP COLUMN "followedId",
ADD COLUMN     "followedBusinessId" TEXT,
ADD COLUMN     "followedUserId" TEXT;

-- CreateIndex
CREATE INDEX "Follow_followedUserId_type_idx" ON "public"."Follow"("followedUserId", "type");

-- CreateIndex
CREATE INDEX "Follow_followedBusinessId_type_idx" ON "public"."Follow"("followedBusinessId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followedUserId_key" ON "public"."Follow"("followerId", "followedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followedBusinessId_key" ON "public"."Follow"("followerId", "followedBusinessId");

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "fk_follow_followed_user" FOREIGN KEY ("followedUserId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "fk_follow_followed_business" FOREIGN KEY ("followedBusinessId") REFERENCES "public"."Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
