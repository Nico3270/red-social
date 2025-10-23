-- AlterTable
ALTER TABLE "Contactos" ADD COLUMN     "abiertoEn" TIMESTAMP(3),
ADD COLUMN     "brevoMessageId" TEXT,
ADD COLUMN     "clicEn" TIMESTAMP(3),
ADD COLUMN     "emailEstado" TEXT,
ADD COLUMN     "entregadoEn" TIMESTAMP(3),
ADD COLUMN     "reboteRazon" TEXT,
ADD COLUMN     "ultimoEventoBrevo" TIMESTAMP(3);
