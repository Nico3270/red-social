-- CreateEnum
CREATE TYPE "public"."TipoNegocio" AS ENUM ('NEGOCIO', 'PROFESIONAL');

-- AlterTable
ALTER TABLE "public"."Negocio" ADD COLUMN     "tipo" "public"."TipoNegocio" DEFAULT 'NEGOCIO';

-- CreateIndex
CREATE INDEX "Negocio_tipo_idx" ON "public"."Negocio"("tipo");
