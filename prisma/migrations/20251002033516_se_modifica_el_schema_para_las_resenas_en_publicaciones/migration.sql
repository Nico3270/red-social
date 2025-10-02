-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "numResenas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingPromedio" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Publicacion" ADD COLUMN     "calificacion" INTEGER;

-- AlterTable
ALTER TABLE "public"."PublicacionProducto" ADD COLUMN     "esResena" BOOLEAN NOT NULL DEFAULT false;
