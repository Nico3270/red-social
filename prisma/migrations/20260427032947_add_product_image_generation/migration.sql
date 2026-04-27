-- CreateEnum
CREATE TYPE "ProductImageGenerationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductImageGenerationProvider" AS ENUM ('OPENAI');

-- CreateEnum
CREATE TYPE "ProductImageGenerationPurpose" AS ENUM ('CATALOG', 'PROMOTIONAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "ProductImageGeneration" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageId" TEXT,
    "prompt" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "purpose" "ProductImageGenerationPurpose" NOT NULL DEFAULT 'CATALOG',
    "variantIndex" INTEGER NOT NULL DEFAULT 1,
    "status" "ProductImageGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "ProductImageGenerationProvider" NOT NULL DEFAULT 'OPENAI',
    "cloudinaryUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "errorMessage" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductImageGeneration_imageId_key" ON "ProductImageGeneration"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImageGeneration_cloudinaryPublicId_key" ON "ProductImageGeneration"("cloudinaryPublicId");

-- CreateIndex
CREATE INDEX "ProductImageGeneration_productId_status_idx" ON "ProductImageGeneration"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductImageGeneration_productId_createdAt_idx" ON "ProductImageGeneration"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductImageGeneration_promptHash_idx" ON "ProductImageGeneration"("promptHash");

-- CreateIndex
CREATE INDEX "ProductImageGeneration_createdById_createdAt_idx" ON "ProductImageGeneration"("createdById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImageGeneration_productId_provider_model_promptHash__key" ON "ProductImageGeneration"("productId", "provider", "model", "promptHash", "size", "quality", "purpose", "variantIndex");

-- AddForeignKey
ALTER TABLE "ProductImageGeneration" ADD CONSTRAINT "ProductImageGeneration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImageGeneration" ADD CONSTRAINT "ProductImageGeneration_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImageGeneration" ADD CONSTRAINT "ProductImageGeneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
