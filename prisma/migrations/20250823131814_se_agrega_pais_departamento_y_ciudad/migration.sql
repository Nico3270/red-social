/*
  Warnings:

  - Added the required column `ciudad` to the `DeliveryData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departamento` to the `DeliveryData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DeliveryData" ADD COLUMN     "ciudad" TEXT NOT NULL,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Colombia',
ADD COLUMN     "departamento" TEXT NOT NULL;
