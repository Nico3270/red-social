-- CreateTable
CREATE TABLE "CatalogGroup" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogGroupProduct" (
    "id" TEXT NOT NULL,
    "catalogGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogGroupProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogGroup_negocioId_idx" ON "CatalogGroup"("negocioId");

-- CreateIndex
CREATE INDEX "CatalogGroup_negocioId_parentId_idx" ON "CatalogGroup"("negocioId", "parentId");

-- CreateIndex
CREATE INDEX "CatalogGroup_negocioId_order_idx" ON "CatalogGroup"("negocioId", "order");

-- CreateIndex
CREATE INDEX "CatalogGroup_parentId_idx" ON "CatalogGroup"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogGroup_negocioId_slug_key" ON "CatalogGroup"("negocioId", "slug");

-- CreateIndex
CREATE INDEX "CatalogGroupProduct_catalogGroupId_idx" ON "CatalogGroupProduct"("catalogGroupId");

-- CreateIndex
CREATE INDEX "CatalogGroupProduct_productId_idx" ON "CatalogGroupProduct"("productId");

-- CreateIndex
CREATE INDEX "CatalogGroupProduct_catalogGroupId_order_idx" ON "CatalogGroupProduct"("catalogGroupId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogGroupProduct_catalogGroupId_productId_key" ON "CatalogGroupProduct"("catalogGroupId", "productId");

-- AddForeignKey
ALTER TABLE "CatalogGroup" ADD CONSTRAINT "CatalogGroup_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogGroup" ADD CONSTRAINT "CatalogGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CatalogGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogGroupProduct" ADD CONSTRAINT "CatalogGroupProduct_catalogGroupId_fkey" FOREIGN KEY ("catalogGroupId") REFERENCES "CatalogGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogGroupProduct" ADD CONSTRAINT "CatalogGroupProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
