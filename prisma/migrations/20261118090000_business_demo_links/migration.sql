CREATE TABLE "BusinessDemoLink" (
  "id" TEXT NOT NULL,
  "negocioId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "productIds" TEXT[] NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "authorizedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessDemoLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessDemoLink_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BusinessDemoLink_tokenHash_key" ON "BusinessDemoLink"("tokenHash");
CREATE INDEX "BusinessDemoLink_negocioId_expiresAt_idx" ON "BusinessDemoLink"("negocioId", "expiresAt");
