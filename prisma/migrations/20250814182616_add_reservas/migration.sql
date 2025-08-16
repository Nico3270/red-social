-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA');

-- CreateTable
CREATE TABLE "public"."BusinessAvailability" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "diasAtencion" TEXT[],
    "franjaMananaInicio" TEXT,
    "franjaMananaFin" TEXT,
    "franjaTardeInicio" TEXT,
    "franjaTardeFin" TEXT,
    "intervaloMinutos" INTEGER NOT NULL,
    "capacidadPorIntervalo" INTEGER NOT NULL,
    "duracionMinimaIntervalos" INTEGER,
    "camposCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3),
    "notas" TEXT,
    "estado" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessAvailability_negocioId_key" ON "public"."BusinessAvailability"("negocioId");

-- CreateIndex
CREATE INDEX "BusinessAvailability_negocioId_idx" ON "public"."BusinessAvailability"("negocioId");

-- CreateIndex
CREATE INDEX "Reservation_negocioId_fechaHoraInicio_idx" ON "public"."Reservation"("negocioId", "fechaHoraInicio");

-- CreateIndex
CREATE INDEX "Reservation_estado_idx" ON "public"."Reservation"("estado");

-- AddForeignKey
ALTER TABLE "public"."BusinessAvailability" ADD CONSTRAINT "BusinessAvailability_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
