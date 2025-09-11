-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- AlterTable
ALTER TABLE "public"."Publicacion" ALTER COLUMN "order" SET DEFAULT 8.0;

-- CreateIndex
CREATE INDEX "Image_productId_idx" ON "public"."Image"("productId");

-- CreateIndex
CREATE INDEX "Product_negocioId_createdAt_idx" ON "public"."Product"("negocioId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_order_createdAt_idx" ON "public"."Product"("order" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PublicacionProducto_productoId_idx" ON "public"."PublicacionProducto"("productoId");
