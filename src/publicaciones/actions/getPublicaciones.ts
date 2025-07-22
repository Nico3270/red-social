"use server";

import prisma from "@/lib/prisma";
import { PublicacionTipo } from "@prisma/client";
import { Publicaciones } from "../interfaces/publicaciones.interface";


interface Props {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
}

interface PublicacionesResult {
  ok: boolean;
  message: string;
  publicaciones: Publicaciones[];
}

export const getPublicacionesNegocio = async ({
  slug,
  tipo,
  skip = 0,
  take = 10,
}: Props): Promise<PublicacionesResult> => {
  // Validate slug
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return {
      ok: false,
      message: "Slug de negocio inválido o no proporcionado",
      publicaciones: [],
    };
  }

  try {
    // Find the business by slug, including the associated user
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: {
        id: true,
        nombre: true,
        slug: true,
        fotoPerfil: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            fotoPerfil: true,
          },
        },
      },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado para el slug proporcionado",
        publicaciones: [],
      };
    }

    // Fetch publications for the business with related data
    const publicaciones = await prisma.publicacion.findMany({
      where: {
        negocioId: negocio.id,
        tipo: tipo,
      },
      include: {
        multimedia: true,
        productosEnPublicacion: {
          select: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true,
                slug: true,
                imagenes: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        interacciones: {
          where: { tipo: "COMENTARIO" },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            usuario: {
              select: {
                nombre: true,
                fotoPerfil: true,
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            fotoPerfil: true,
          },
        },
      },
      skip,
      take,
    });

    // Transform the data to match the Publicaciones interface
    const formattedPublicaciones: Publicaciones[] = publicaciones.map((pub) => ({
      id: pub.id,
      usuarioId: pub.usuarioId, // String, requerido por el esquema
      negocioId: pub.negocioId,
      tipo: pub.tipo,
      titulo: pub.titulo,
      descripcion: pub.descripcion,
      createdAt: pub.createdAt,
      updatedAt: pub.updatedAt,
      multimedia: pub.multimedia,
      productos: pub.productosEnPublicacion.map((pp) => ({
        id: pp.producto.id,
        nombre: pp.producto.nombre,
        precio: pp.producto.precio,
        imagen: pp.producto.imagenes[0]?.url ?? null,
        slug: pp.producto.slug,
      })),
      numLikes: pub.numLikes,
      numComentarios: pub.numComentarios,
      numCompartidos: pub.numCompartidos,
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        slug: negocio.slug,
        imagenPerfil: negocio.fotoPerfil,
      },
      comentarios: pub.interacciones.map((interaccion) => ({
        id: interaccion.id,
        contenido: interaccion.contenido ?? "",
        usuarioId: interaccion.usuarioId, // String, requerido por el esquema
        usuarioNombre: interaccion.usuario.nombre,
        createdAt: interaccion.createdAt,
        usuarioFotoPerfil: interaccion.usuario.fotoPerfil ?? undefined, // Convertir null a undefined
      })),
      isLiked: false, // Default to false, as interactions are handled client-side
    }));

    return {
      ok: true,
      message: "Publicaciones obtenidas exitosamente",
      publicaciones: formattedPublicaciones,
    };
  } catch (error) {
    console.error("Error fetching publicaciones:", error);
    let message = "Error al obtener las publicaciones";
    if (error instanceof Error) {
      message = `Error al obtener las publicaciones: ${error.message}`;
    }
    return {
      ok: false,
      message,
      publicaciones: [],
    };
  }
};