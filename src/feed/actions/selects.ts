// src/actions/feed/selects.ts
import { Prisma, ProductStatus } from "@prisma/client";

// PRODUCT
export const productSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  nombre: true,
  precio: true,
  descripcion: true,
  descripcionCorta: true,
  slug: true,
  prioridad: true,
  status: true,
  tags: true,
  componentes: true,
  categoryId: true,
  category: { select: { slug: true, nombre: true } },
  imagenes: { select: { url: true } },
  secciones: { select: { section: { select: { id: true, slug: true, nombre: true } } } },
  negocio: {
    select: {
      id: true,
      slug: true,
      nombre: true,
      telefonoContacto: true,
      fotoPerfil: true,
      ciudad: true,
      departamento: true,
    },
  },
  createdAt: true,
});

// ✅ Usa el tipo inferido de Prisma
export type RawProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

// PUBLICATION
export const publicationSelect = Prisma.validator<Prisma.PublicacionSelect>()({
  id: true,
  titulo: true,
  descripcion: true,
  multimedia: { select: { id: true, url: true, tipo: true, formato: true, orden: true } },
  negocio: { select: { id: true, slug: true, nombre: true, fotoPerfil: true, ciudad: true, departamento: true } },
  numLikes: true,
  numComentarios: true,
  usuario: { select: { id: true, nombre: true, apellido: true, username: true, fotoPerfil: true } },
  tipo: true,
  visibilidad: true,
  createdAt: true,
});
export type RawPublication = Prisma.PublicacionGetPayload<{ select: typeof publicationSelect }>;

// SERVICE
export const serviceSelect = Prisma.validator<Prisma.ServicioSelect>()({
  id: true,
  titulo: true,
  descripcion: true,
  slug: true,
  precio: true,
  currency: true,
  status: true,
  tags: true,
  multimedia: { select: { url: true, orden: true, tipo: true } },
  negocio: {
    select: {
      id: true,
      slug: true,
      nombre: true,
      telefonoContacto: true,
      fotoPerfil: true,
      ciudad: true,
      departamento: true,
    },
  },
  createdAt: true,
});
export type RawService = Prisma.ServicioGetPayload<{ select: typeof serviceSelect }>;

// BUSINESS
export const businessSelect = Prisma.validator<Prisma.NegocioSelect>()({
  id: true,
  nombre: true,
  descripcion: true,
  fotoPerfil: true,
  fotoPortada: true, // Asegúrate que coincida con tu esquema. Si tu campo real es "fotoPortada", cámbialo aquí y en el mapper.
  slug: true,
  ciudad: true,
  departamento: true,
  telefonoContacto: true,
  urlGoogleMaps: true,
  categorias: { select: { category: { select: { slug: true } } } },
  secciones: { select: { section: { select: { id: true, slug: true } } } },
  estado: true,
  createdAt: true,
});
export type RawBusiness = Prisma.NegocioGetPayload<{ select: typeof businessSelect }>;

export type RawData = RawProduct | RawPublication | RawService | RawBusiness;
