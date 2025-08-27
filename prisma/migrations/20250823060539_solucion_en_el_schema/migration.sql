/*
  Warnings:

  - You are about to drop the column `estado` on the `Order` table. All the data in the column will be lost.
  - Added the required column `type` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Order_estado_idx";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "estado",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'ventas',
ADD COLUMN     "status" "public"."OrderState" NOT NULL DEFAULT 'Recibida',
ADD COLUMN     "type" "public"."TransactionType" NOT NULL;

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");
