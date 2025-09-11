/*
  Warnings:

  - You are about to drop the column `order` on the `Product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Product_order_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "order",
ADD COLUMN     "orden" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- CreateIndex
CREATE INDEX "Product_orden_createdAt_idx" ON "public"."Product"("orden" DESC, "createdAt" DESC);
