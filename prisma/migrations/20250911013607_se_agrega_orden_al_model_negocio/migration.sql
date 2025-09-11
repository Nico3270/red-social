-- AlterTable
ALTER TABLE "public"."Negocio" ADD COLUMN     "orden" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- CreateIndex
CREATE INDEX "Negocio_orden_createdAt_idx" ON "public"."Negocio"("orden" DESC, "createdAt" DESC);
