/*
  Warnings:

  - The `latitud` column on the `Negocio` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `longitud` column on the `Negocio` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Negocio" DROP COLUMN "latitud",
ADD COLUMN     "latitud" DOUBLE PRECISION,
DROP COLUMN "longitud",
ADD COLUMN     "longitud" DOUBLE PRECISION;
