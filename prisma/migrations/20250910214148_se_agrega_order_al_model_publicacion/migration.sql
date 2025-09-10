-- AlterTable
ALTER TABLE "public"."Publicacion" ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 5.0;

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "public"."Category"("slug");

-- CreateIndex
CREATE INDEX "Follow_followedBusinessId_idx" ON "public"."Follow"("followedBusinessId");

-- CreateIndex
CREATE INDEX "Interaccion_publicacionId_reaccionTipo_idx" ON "public"."Interaccion"("publicacionId", "reaccionTipo");

-- CreateIndex
CREATE INDEX "Media_publicacionId_idx" ON "public"."Media"("publicacionId");

-- CreateIndex
CREATE INDEX "Media_publicacionId_tipo_idx" ON "public"."Media"("publicacionId", "tipo");

-- CreateIndex
CREATE INDEX "Negocio_estado_createdAt_idx" ON "public"."Negocio"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "Publicacion_negocioId_visibilidad_createdAt_idx" ON "public"."Publicacion"("negocioId", "visibilidad", "createdAt");

-- CreateIndex
CREATE INDEX "Publicacion_order_createdAt_idx" ON "public"."Publicacion"("order" DESC, "createdAt" DESC);
