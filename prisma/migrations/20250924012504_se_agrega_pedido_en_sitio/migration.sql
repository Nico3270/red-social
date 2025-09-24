-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('DELIVERY', 'ON_SITE');

-- AlterTable
ALTER TABLE "public"."DeliveryData" ADD COLUMN     "onSiteLocation" TEXT,
ALTER COLUMN "deliveryAddress" DROP NOT NULL,
ALTER COLUMN "ciudad" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "departamento" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "orderType" "public"."OrderType" NOT NULL DEFAULT 'DELIVERY';

-- CreateIndex
CREATE INDEX "Order_orderType_idx" ON "public"."Order"("orderType");
