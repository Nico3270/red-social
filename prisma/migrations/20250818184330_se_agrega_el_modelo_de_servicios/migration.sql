-- CreateEnum
CREATE TYPE "public"."ServicioStatus" AS ENUM ('disponible', 'no_disponible', 'oculto', 'descontinuado');

-- AlterTable
ALTER TABLE "public"."Media" ADD COLUMN     "servicioId" TEXT;

-- CreateTable
CREATE TABLE "public"."Servicio" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT[],
    "slug" TEXT NOT NULL,
    "precio" DOUBLE PRECISION,
    "currency" "public"."Currency" NOT NULL DEFAULT 'COP',
    "status" "public"."ServicioStatus" NOT NULL DEFAULT 'disponible',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "negocioId" TEXT NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_slug_key" ON "public"."Servicio"("slug");

-- CreateIndex
CREATE INDEX "Servicio_negocioId_idx" ON "public"."Servicio"("negocioId");

-- CreateIndex
CREATE INDEX "Servicio_status_idx" ON "public"."Servicio"("status");

-- CreateIndex
CREATE INDEX "Servicio_negocioId_status_idx" ON "public"."Servicio"("negocioId", "status");

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "public"."Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Servicio" ADD CONSTRAINT "Servicio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
