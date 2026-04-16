// src/actions/feed/selects.ts
import { Prisma } from "@prisma/client";

// PRODUCT
export const productSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  nombre: true,
  precio: true,
  descripcion: true,
  descripcionCorta: true,
  slug: true,
  orden: true,
  prioridad: true,
  status: true,
  etiquetaEspecial: true,
  ratingPromedio: true,
  numResenas: true,
  tags: true,
  componentes: true,
  categoryId: true,
  stock: true,
  stockIlimitado: true,
  usaVariantes: true,
  category: { select: { slug: true, nombre: true } },
  imagenes: { select: { url: true } },
  secciones: { select: { section: { select: { id: true, slug: true, nombre: true } } } },
  variantes: {
    where: { isActive: true },
    select: {
      id: true,
      nombre: true,
      sku: true,
      precio: true,
      stock: true,
      stockIlimitado: true,
      isActive: true,
      imagenUrl: true,
      orden: true,
      options: {
        select: {
          id: true,
          nombre: true,
          valor: true,
          orden: true,
        },
        orderBy: { orden: "asc" },
      },
    },
    orderBy: { orden: "asc" },
  },
  negocio: {
    select: {
      id: true,
      slug: true,
      nombre: true,
      telefonoContacto: true,
      fotoPerfil: true,
      ciudad: true,
      departamento: true,
      latitud: true,     // ← AÑADIDO
      longitud: true,
      _count: {
        select: {
          followsIn: true,
          publicaciones: true,
          Product: true,
          Servicio: true,
        },
      },
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
  orden: true,
  multimedia: { 
    select: { id: true, url: true, tipo: true, formato: true, orden: true } 
  },
  negocio: { 
    select: { 
      id: true, 
      slug: true, 
      nombre: true, 
      fotoPerfil: true, 
      ciudad: true, 
      departamento: true,  // Útil para filtros locales en feed
      latitud: true,     // ← AÑADIDO
      longitud: true,
      _count: {
        select: {
          followsIn: true,
          publicaciones: true,
          Product: true,
          Servicio: true,
        },
      },
    } 
  },
  numLikes: true,
  numComentarios: true,
  numCompartidos: true,
  usuario: { 
    select: { 
      id: true, 
      nombre: true, 
      apellido: true, 
      username: true, 
      fotoPerfil: true 
    } 
  },
  tipo: true,
  visibilidad: true,
  createdAt: true,
  calificacion: true, // Nuevo: para calificación de reseñas (1-5)
  productosEnPublicacion: { // Nuevo: para asociar producto en reseñas
    where: { esResena: true }, // Solo reseñas
    select: {
      producto: {
        select: {
          id: true,
          nombre: true,
          slug: true,
        },
      },
    },
    take: 1, // Solo un producto por publicación (reseña)
  },
  interacciones: {
    where: { 
      tipo: 'COMENTARIO'  // Filtra solo comentarios (discriminador)
    },
    take: 3,
    orderBy: { createdAt: 'desc' },  // Más recientes primero
    select: {
      id: true,
      contenido: true,  // Campo específico de interacciones para COMENTARIO
      createdAt: true,
      usuario: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          fotoPerfil: true,
          username: true,
          
        },
      },
    },
  },
});

export type RawPublication = Prisma.PublicacionGetPayload<{ select: typeof publicationSelect }>;

// SERVICE
export const serviceSelect = Prisma.validator<Prisma.ServicioSelect>()({
  id: true,
  titulo: true,
  descripcion: true,
  slug: true,
  orden: true,
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
      latitud: true,     // ← AÑADIDO
      longitud: true,
      _count: {
        select: {
          followsIn: true,
          publicaciones: true,
          Product: true,
          Servicio: true,
        },
      },
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
  fotoPortada: true,
  slug: true,
  orden: true,
  ciudad: true,
  departamento: true,
  telefonoContacto: true,
  urlGoogleMaps: true,
  categorias: { select: { category: { select: { slug: true } } } },
  secciones: { select: { section: { select: { id: true, slug: true } } } },
  estado: true,
  createdAt: true,
  latitud: true,     // ← AÑADIDO
  longitud: true,
  _count: {
    select: {
      followsIn: true,
      publicaciones: true,
      Product: true,
      Servicio: true,
    },
  },
});
export type RawBusiness = Prisma.NegocioGetPayload<{ select: typeof businessSelect }>;

export type RawData = RawProduct | RawPublication | RawService | RawBusiness;
