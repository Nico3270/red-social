-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "placeholderProvisioningKeyHash" TEXT;

-- CreateTable
CREATE TABLE "AccountClaim" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountClaim_tokenHash_key" ON "AccountClaim"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountClaim_usuarioId_idx" ON "AccountClaim"("usuarioId");

-- CreateIndex
CREATE INDEX "AccountClaim_expiresAt_idx" ON "AccountClaim"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_placeholderProvisioningKeyHash_key" ON "Usuario"("placeholderProvisioningKeyHash");

-- AddForeignKey
ALTER TABLE "AccountClaim" ADD CONSTRAINT "AccountClaim_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
