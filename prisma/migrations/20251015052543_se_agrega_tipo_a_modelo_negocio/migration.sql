/*
  Warnings:

  - Made the column `tipo` on table `Negocio` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Negocio_tipo_idx";

-- AlterTable
ALTER TABLE "Negocio" ALTER COLUMN "tipo" SET NOT NULL;
