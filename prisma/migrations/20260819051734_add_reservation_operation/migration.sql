-- CreateEnum
CREATE TYPE "ReservationOperationAction" AS ENUM ('CREATE', 'UPDATE', 'CANCEL');

-- CreateEnum
CREATE TYPE "ReservationOperationOutcome" AS ENUM ('CREATED', 'UPDATED', 'UNCHANGED', 'CANCELLED', 'ALREADY_CANCELLED');

-- CreateTable
CREATE TABLE "ReservationOperation" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "action" "ReservationOperationAction" NOT NULL,
    "sourceReference" VARCHAR(255) NOT NULL,
    "requestFingerprint" VARCHAR(67) NOT NULL,
    "managementLinkRequired" BOOLEAN NOT NULL,
    "outcome" "ReservationOperationOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationOperation_negocioId_action_sourceReference_key" ON "ReservationOperation"("negocioId", "action", "sourceReference");

-- CreateIndex
CREATE INDEX "ReservationOperation_reservationId_idx" ON "ReservationOperation"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationOperation" ADD CONSTRAINT "ReservationOperation_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationOperation" ADD CONSTRAINT "ReservationOperation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
