-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('CLIENTE', 'LEAD', 'PROVEEDOR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoContacto" AS ENUM ('ACTIVO', 'INACTIVO', 'PENDIENTE');

-- CreateTable
CREATE TABLE "Contactos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "telefono" TEXT,
    "promocionalEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,
    "tipoContacto" "TipoContacto" DEFAULT 'OTRO',
    "estado" "EstadoContacto" NOT NULL DEFAULT 'ACTIVO',
    "negocioId" TEXT,

    CONSTRAINT "Contactos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contactos_correo_key" ON "Contactos"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Contactos_identificacion_key" ON "Contactos"("identificacion");

-- CreateIndex
CREATE INDEX "Contactos_correo_idx" ON "Contactos"("correo");

-- CreateIndex
CREATE INDEX "Contactos_identificacion_idx" ON "Contactos"("identificacion");

-- CreateIndex
CREATE INDEX "Contactos_negocioId_idx" ON "Contactos"("negocioId");

-- AddForeignKey
ALTER TABLE "Contactos" ADD CONSTRAINT "Contactos_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
