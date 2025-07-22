/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `Product` table. All the data in the column will be lost.
  - Added the required column `negocioId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_usuarioId_fkey";

-- DropIndex
DROP INDEX "Product_usuarioId_idx";

-- DropIndex
DROP INDEX "Product_usuarioId_status_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "usuarioId",
ADD COLUMN     "negocioId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Product_negocioId_idx" ON "Product"("negocioId");

-- CreateIndex
CREATE INDEX "Product_negocioId_status_idx" ON "Product"("negocioId", "status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
