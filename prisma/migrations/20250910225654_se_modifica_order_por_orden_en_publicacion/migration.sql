/*
  Warnings:

  - You are about to drop the column `order` on the `Publicacion` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Publicacion_order_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."Publicacion" DROP COLUMN "order",
ADD COLUMN     "orden" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- CreateIndex
CREATE INDEX "Publicacion_orden_createdAt_idx" ON "public"."Publicacion"("orden" DESC, "createdAt" DESC);
