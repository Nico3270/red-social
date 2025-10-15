-- CreateIndex
CREATE INDEX "Negocio_nombre_idx" ON "public"."Negocio"("nombre");

-- CreateIndex
CREATE INDEX "Product_tags_idx" ON "public"."Product" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "Product_componentes_idx" ON "public"."Product" USING GIN ("componentes");

-- CreateIndex
CREATE INDEX "Servicio_tags_idx" ON "public"."Servicio" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "Servicio_descripcion_idx" ON "public"."Servicio" USING GIN ("descripcion");

-- CreateIndex
CREATE INDEX "Usuario_preferencias_idx" ON "public"."Usuario" USING GIN ("preferencias");
