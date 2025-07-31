"use server";

import prisma from "@/lib/prisma";
import { PublicacionTipo } from "@prisma/client";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";

interface Props {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
  userId?: string; // ID del usuario autenticado para verificar reacciones
}

interface PublicacionesResult {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

export const getPublicacionesNegocio = async ({
  slug,
  tipo,
  skip = 0,
  take = 10,
  userId,
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
            apellido: true, // Requerido por User
            username: true, // Requerido por User
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
        multimedia: {
          select: {
            id: true,
            url: true,
            tipo: true,
            formato: true,
            orden: true,
          },
        },
        interacciones: {
          where: { tipo: "COMENTARIO" },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true, // Requerido por User
                username: true, // Requerido por User
                fotoPerfil: true,
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true, // Requerido por User
            username: true, // Requerido por User
            fotoPerfil: true,
          },
        },
      },
      skip,
      take,
    });

    // Fetch user reactions if userId is provided
    const userReactions = userId
      ? await prisma.interaccion.findMany({
          where: {
            usuarioId: userId,
            publicacionId: { in: publicaciones.map((pub) => pub.id) },
            
          },
          select: {
            publicacionId: true,
            tipo: true,
            id: true,
          },
        })
      : [];

    // Transform the data to match the EnhancedPublicacion interface
    const formattedPublicaciones: EnhancedPublicacion[] = publicaciones.map((pub) => {
      const userReaction = userReactions.find((reaction) => reaction.publicacionId === pub.id) || null;

      return {
        id: pub.id,
        usuario: {
          id: pub.usuario.id,
          nombre: pub.usuario.nombre,
          apellido: pub.usuario.apellido ?? "", // Fallback si apellido es null
          username: pub.usuario.username ?? "", // Fallback si username es null
          fotoPerfil: pub.usuario.fotoPerfil ?? undefined,
        },
        negocio: {
          id: negocio.id,
          nombre: negocio.nombre,
          slug: negocio.slug,
          fotoPerfil: negocio.fotoPerfil ?? undefined,
        },
        tipo: pub.tipo,
        titulo: pub.titulo ?? undefined,
        descripcion: pub.descripcion ?? undefined,
        multimedia: pub.multimedia.map((media) => ({
          id: media.id,
          url: media.url,
          tipo: media.tipo,
          formato: media.formato ?? undefined,
          orden: media.orden,
        })),
        visibilidad: pub.visibilidad ?? "PUBLICA", // Fallback si visibilidad es null
        createdAt: pub.createdAt.toISOString(),
        numLikes: pub.numLikes,
        numComentarios: pub.numComentarios,
        numCompartidos: pub.numCompartidos,
        userReaction: userReaction
          ? {
              id: userReaction.id,
              tipo: userReaction.tipo as "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY",
            }
          : null,
        comments: pub.interacciones.map((interaccion) => ({
          id: interaccion.id,
          contenido: interaccion.contenido ?? "",
          createdAt: interaccion.createdAt.toISOString(),
          usuario: {
            id: interaccion.usuario.id,
            nombre: interaccion.usuario.nombre,
            apellido: interaccion.usuario.apellido ?? "", // Fallback si apellido es null
            username: interaccion.usuario.username ?? "", // Fallback si username es null
            fotoPerfil: interaccion.usuario.fotoPerfil ?? undefined,
          },
        })),
        // isAuthenticated: !!userId, // true si userId está presente
        // onInteraction se deja como undefined ya que es una función y no se puede serializar
      };
    });

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