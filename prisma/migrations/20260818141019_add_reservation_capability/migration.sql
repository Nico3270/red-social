-- CreateTable
CREATE TABLE "ReservationCapability" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationCapability_tokenHash_key" ON "ReservationCapability"("tokenHash");

-- CreateIndex
CREATE INDEX "ReservationCapability_reservationId_idx" ON "ReservationCapability"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationCapability" ADD CONSTRAINT "ReservationCapability_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
