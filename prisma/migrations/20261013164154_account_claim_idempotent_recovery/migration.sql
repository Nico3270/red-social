-- AlterTable
ALTER TABLE "AccountClaim" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "negocioId" TEXT,
ADD COLUMN     "derivationKeyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AccountClaim_idempotencyKey_key" ON "AccountClaim"("idempotencyKey");
