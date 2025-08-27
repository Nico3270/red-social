/*
  Warnings:

  - You are about to drop the column `category` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deliveryDataId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."OrderState" AS ENUM ('Recibida', 'Entregada', 'Pagada', 'Cancelada', 'Preparacion');

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_usuarioId_fkey";

-- DropIndex
DROP INDEX "public"."Order_transactionId_key";

-- DropIndex
DROP INDEX "public"."Order_usuarioId_date_idx";

-- DropIndex
DROP INDEX "public"."Transaction_orderId_key";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "category",
DROP COLUMN "status",
DROP COLUMN "transactionId",
DROP COLUMN "type",
DROP COLUMN "usuarioId",
ADD COLUMN     "deliveryDataId" TEXT,
ADD COLUMN     "estado" "public"."OrderState" NOT NULL DEFAULT 'Recibida',
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "orderId";

-- DropEnum
DROP TYPE "public"."OrderStatus";

-- CreateTable
CREATE TABLE "public"."OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "previousState" TEXT,
    "newState" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryData" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3),

    CONSTRAINT "DeliveryData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_deliveryDataId_key" ON "public"."Order"("deliveryDataId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "public"."Order"("userId");

-- CreateIndex
CREATE INDEX "Order_estado_idx" ON "public"."Order"("estado");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_deliveryDataId_fkey" FOREIGN KEY ("deliveryDataId") REFERENCES "public"."DeliveryData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
