/*
  Warnings:

  - A unique constraint covering the columns `[productId,sectionId]` on the table `ProductSection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductSection_productId_sectionId_key" ON "ProductSection"("productId", "sectionId");
