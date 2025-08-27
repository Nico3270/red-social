/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."TipoUsuario" AS ENUM ('negocio', 'usuario');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "TipoUsuario" "public"."TipoUsuario" NOT NULL DEFAULT 'negocio',
ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_transactionId_key" ON "public"."Order"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "public"."Transaction"("orderId");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
