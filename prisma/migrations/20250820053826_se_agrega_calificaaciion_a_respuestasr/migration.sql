-- AlterTable
ALTER TABLE "public"."Respuesta" ADD COLUMN     "calificacion" INTEGER,
ALTER COLUMN "valor" DROP NOT NULL;
