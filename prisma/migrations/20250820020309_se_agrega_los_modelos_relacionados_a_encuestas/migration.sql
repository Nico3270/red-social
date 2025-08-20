-- CreateEnum
CREATE TYPE "public"."TipoPregunta" AS ENUM ('CALIFICABLE', 'TEXTO');

-- CreateEnum
CREATE TYPE "public"."Creador" AS ENUM ('ADMIN', 'NEGOCIO');

-- CreateTable
CREATE TABLE "public"."Pregunta" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "public"."TipoPregunta" NOT NULL,
    "creador" "public"."Creador" NOT NULL,
    "negocioId" TEXT,
    "requerida" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER,
    "categoria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Encuesta" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT,

    CONSTRAINT "Encuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EncuestaPregunta" (
    "encuestaId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "orden" INTEGER,

    CONSTRAINT "EncuestaPregunta_pkey" PRIMARY KEY ("encuestaId","preguntaId")
);

-- CreateTable
CREATE TABLE "public"."Resena" (
    "id" TEXT NOT NULL,
    "encuestaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nombre" TEXT,
    "telefono" TEXT,
    "descripcionGeneral" TEXT,
    "multimedia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Respuesta" (
    "id" TEXT NOT NULL,
    "resenaId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "usuarioId" TEXT,

    CONSTRAINT "Respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pregunta_creador_negocioId_idx" ON "public"."Pregunta"("creador", "negocioId");

-- CreateIndex
CREATE INDEX "Encuesta_negocioId_createdAt_idx" ON "public"."Encuesta"("negocioId", "createdAt");

-- CreateIndex
CREATE INDEX "Resena_encuestaId_createdAt_idx" ON "public"."Resena"("encuestaId", "createdAt");

-- CreateIndex
CREATE INDEX "Resena_usuarioId_idx" ON "public"."Resena"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."Pregunta" ADD CONSTRAINT "Pregunta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Encuesta" ADD CONSTRAINT "Encuesta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Encuesta" ADD CONSTRAINT "Encuesta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EncuestaPregunta" ADD CONSTRAINT "EncuestaPregunta_encuestaId_fkey" FOREIGN KEY ("encuestaId") REFERENCES "public"."Encuesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EncuestaPregunta" ADD CONSTRAINT "EncuestaPregunta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "public"."Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resena" ADD CONSTRAINT "Resena_encuestaId_fkey" FOREIGN KEY ("encuestaId") REFERENCES "public"."Encuesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resena" ADD CONSTRAINT "Resena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Respuesta" ADD CONSTRAINT "Respuesta_resenaId_fkey" FOREIGN KEY ("resenaId") REFERENCES "public"."Resena"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Respuesta" ADD CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "public"."Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Respuesta" ADD CONSTRAINT "Respuesta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
