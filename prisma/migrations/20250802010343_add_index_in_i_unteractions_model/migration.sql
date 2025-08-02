-- CreateIndex
CREATE INDEX "Interaccion_publicacionId_createdAt_idx" ON "public"."Interaccion"("publicacionId", "createdAt");

-- CreateIndex
CREATE INDEX "Interaccion_publicacionId_tipo_idx" ON "public"."Interaccion"("publicacionId", "tipo");

-- CreateIndex
CREATE INDEX "Interaccion_usuarioId_createdAt_idx" ON "public"."Interaccion"("usuarioId", "createdAt");
