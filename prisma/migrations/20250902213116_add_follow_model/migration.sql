-- CreateEnum
CREATE TYPE "public"."FollowType" AS ENUM ('USER_TO_BUSINESS', 'BUSINESS_TO_USER', 'USER_TO_USER');

-- CreateTable
CREATE TABLE "public"."Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followedId" TEXT NOT NULL,
    "type" "public"."FollowType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_followerId_type_idx" ON "public"."Follow"("followerId", "type");

-- CreateIndex
CREATE INDEX "Follow_followedId_type_idx" ON "public"."Follow"("followedId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followedId_key" ON "public"."Follow"("followerId", "followedId");

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "fk_follow_followed_user" FOREIGN KEY ("followedId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "fk_follow_followed_business" FOREIGN KEY ("followedId") REFERENCES "public"."Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
