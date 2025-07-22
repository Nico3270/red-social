-- CreateEnum
CREATE TYPE "EstadoNegocio" AS ENUM ('activo', 'suspendido', 'eliminado');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('activo', 'suspendido', 'eliminado');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user', 'navegante', 'creador', 'negocio');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('masculino', 'femenino', 'otro');

-- CreateEnum
CREATE TYPE "ProductEtiquetaEspecial" AS ENUM ('mas_buscado', 'mas_vendido', 'novedad', 'reciente', 'promocion', 'ultimos_dias', 'ninguna');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COP', 'USD', 'EUR', 'MXN', 'ARS', 'BRL');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('disponible', 'agotado', 'oculto', 'descontinuado');

-- CreateEnum
CREATE TYPE "Visibilidad" AS ENUM ('PUBLICA', 'PRIVADA', 'AMIGOS');

-- CreateEnum
CREATE TYPE "PublicacionTipo" AS ENUM ('VIDEO_HORIZONTAL', 'VIDEO_VERTICAL', 'CARRUSEL_IMAGENES', 'PRODUCTO_DESTACADO', 'MINI_GRID', 'TESTIMONIO');

-- CreateEnum
CREATE TYPE "MultimediaTipo" AS ENUM ('IMAGEN', 'VIDEO');

-- CreateEnum
CREATE TYPE "InteraccionTipo" AS ENUM ('COMENTARIO', 'REACCION', 'COMPARTIDO');

-- CreateEnum
CREATE TYPE "ReaccionTipo" AS ENUM ('LIKE', 'LOVE', 'WOW', 'SAD', 'ANGRY');

-- CreateTable
CREATE TABLE "Negocio" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ciudad" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "direccion" TEXT,
    "urlGoogleMaps" TEXT,
    "horarios" JSONB,
    "imagenes" TEXT[],
    "sitioWeb" TEXT,
    "telefonoContacto" TEXT,
    "estado" "EstadoNegocio" NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegocioCategory" (
    "negocioId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "NegocioSection" (
    "negocioId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "contraseña" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "pais" TEXT DEFAULT 'Colombia',
    "genero" "Genero" NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "fotoPerfil" TEXT,
    "biografia" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "twitter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ultimaActividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'activo',
    "emailVerified" TIMESTAMP(3),
    "preferencias" TEXT[],

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "descripcionCorta" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "prioridad" INTEGER,
    "status" "ProductStatus" NOT NULL DEFAULT 'disponible',
    "etiquetaEspecial" "ProductEtiquetaEspecial" DEFAULT 'ninguna',
    "tags" TEXT[],
    "componentes" TEXT[],
    "disponibleDesde" TIMESTAMP(3),
    "disponibleHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconName" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publicacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "negocioId" TEXT,
    "tipo" "PublicacionTipo" NOT NULL,
    "titulo" TEXT,
    "descripcion" TEXT,
    "visibilidad" "Visibilidad" NOT NULL DEFAULT 'PUBLICA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numLikes" INTEGER NOT NULL DEFAULT 0,
    "numComentarios" INTEGER NOT NULL DEFAULT 0,
    "numCompartidos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicacionProducto" (
    "id" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PublicacionProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "tipo" "MultimediaTipo" NOT NULL,
    "formato" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "publicacionId" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaccion" (
    "id" TEXT NOT NULL,
    "tipo" "InteraccionTipo" NOT NULL,
    "contenido" TEXT,
    "reaccionTipo" "ReaccionTipo",
    "usuarioId" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_usuarioId_key" ON "Negocio"("usuarioId");

-- CreateIndex
CREATE INDEX "Negocio_ciudad_idx" ON "Negocio"("ciudad");

-- CreateIndex
CREATE INDEX "Negocio_departamento_idx" ON "Negocio"("departamento");

-- CreateIndex
CREATE INDEX "Negocio_estado_idx" ON "Negocio"("estado");

-- CreateIndex
CREATE INDEX "Negocio_usuarioId_idx" ON "Negocio"("usuarioId");

-- CreateIndex
CREATE INDEX "NegocioCategory_categoryId_idx" ON "NegocioCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "NegocioCategory_negocioId_categoryId_key" ON "NegocioCategory"("negocioId", "categoryId");

-- CreateIndex
CREATE INDEX "NegocioSection_sectionId_idx" ON "NegocioSection"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "NegocioSection_negocioId_sectionId_key" ON "NegocioSection"("negocioId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_username_idx" ON "Usuario"("username");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_role_idx" ON "Usuario"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_usuarioId_idx" ON "Product"("usuarioId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_nombre_idx" ON "Product"("nombre");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Product_etiquetaEspecial_idx" ON "Product"("etiquetaEspecial");

-- CreateIndex
CREATE INDEX "Product_usuarioId_status_idx" ON "Product"("usuarioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Section_slug_key" ON "Section"("slug");

-- CreateIndex
CREATE INDEX "Section_categoryId_idx" ON "Section"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSection_productId_sectionId_key" ON "ProductSection"("productId", "sectionId");

-- CreateIndex
CREATE INDEX "Publicacion_tipo_visibilidad_createdAt_idx" ON "Publicacion"("tipo", "visibilidad", "createdAt");

-- CreateIndex
CREATE INDEX "Publicacion_usuarioId_createdAt_idx" ON "Publicacion"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "Publicacion_negocioId_createdAt_idx" ON "Publicacion"("negocioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicacionProducto_publicacionId_productoId_key" ON "PublicacionProducto"("publicacionId", "productoId");

-- AddForeignKey
ALTER TABLE "Negocio" ADD CONSTRAINT "Negocio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegocioCategory" ADD CONSTRAINT "NegocioCategory_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegocioCategory" ADD CONSTRAINT "NegocioCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegocioSection" ADD CONSTRAINT "NegocioSection_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegocioSection" ADD CONSTRAINT "NegocioSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacion" ADD CONSTRAINT "Publicacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacion" ADD CONSTRAINT "Publicacion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicacionProducto" ADD CONSTRAINT "PublicacionProducto_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicacionProducto" ADD CONSTRAINT "PublicacionProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaccion" ADD CONSTRAINT "Interaccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaccion" ADD CONSTRAINT "Interaccion_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
