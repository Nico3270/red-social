-- AlterTable
ALTER TABLE "public"."Servicio" ADD COLUMN     "orden" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- CreateIndex
CREATE INDEX "Servicio_orden_createdAt_idx" ON "public"."Servicio"("orden" DESC, "createdAt" DESC);
