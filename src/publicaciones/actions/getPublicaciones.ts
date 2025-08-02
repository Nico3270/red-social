"use server";

import prisma from "@/lib/prisma";
import { PublicacionTipo, InteraccionTipo } from "@prisma/client";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";


// Tipos existentes
interface User {
  id: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string;
  username: string;
}

export interface Media {
  id: string;
  url: string;
  tipo: "IMAGEN" | "VIDEO";
  formato?: string;
  orden: number;
}



// Tipo para las reacciones del usuario
interface UserReaction {
  publicacionId: string;
  tipo: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY";
  id: string;
}

interface Props {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
  userId?: string;
}

interface PublicacionesResult {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

// Definición de ReaccionTipo como tipo literal para validación
type ReaccionTipo = "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY";

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
            apellido: true,
            username: true,
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
        visibilidad: "PUBLICA",
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
                apellido: true,
                username: true,
                fotoPerfil: true,
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            username: true,
            fotoPerfil: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    // Fetch user reactions if userId is provided
    let userReactions: UserReaction[] = [];
    if (userId) {
      const rawReactions = await prisma.interaccion.findMany({
        where: {
          usuarioId: userId,
          publicacionId: { in: publicaciones.map((pub) => pub.id) },
          tipo: { in: ["LIKE", "LOVE", "WOW", "SAD", "ANGRY"] as unknown as InteraccionTipo[] }, // Conversión segura a unknown
        },
        select: {
          publicacionId: true,
          tipo: true,
          id: true,
        },
      });
      // Mapeo seguro a UserReaction con validación
      userReactions = rawReactions.map((reaction): UserReaction => {
        const { publicacionId, tipo, id } = reaction;
        if (!["LIKE", "LOVE", "WOW", "SAD", "ANGRY"].includes(tipo)) {
          throw new Error(`Tipo de reacción inválido: ${tipo}`);
        }
        return { publicacionId, tipo: tipo as ReaccionTipo, id };
      });
    }

    // Transform the data to match the EnhancedPublicacion interface
    const formattedPublicaciones: EnhancedPublicacion[] = publicaciones.map((pub) => {
      const userReaction = userId
        ? userReactions.find((reaction) => reaction.publicacionId === pub.id) || null
        : null;

      return {
        id: pub.id,
        usuario: {
          id: pub.usuario.id,
          nombre: pub.usuario.nombre,
          apellido: pub.usuario.apellido ?? "",
          username: pub.usuario.username ?? "",
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
        visibilidad: pub.visibilidad ?? "PUBLICA",
        createdAt: pub.createdAt.toISOString(),
        numLikes: pub.numLikes,
        numComentarios: pub.numComentarios,
        numCompartidos: pub.numCompartidos,
        userReaction: userReaction
          ? {
              id: userReaction.id,
              tipo: userReaction.tipo,
            }
          : null,
        comments: pub.interacciones.map((interaccion) => ({
          id: interaccion.id,
          contenido: interaccion.contenido ?? "",
          createdAt: interaccion.createdAt.toISOString(),
          usuario: {
            id: interaccion.usuario.id,
            nombre: interaccion.usuario.nombre,
            apellido: interaccion.usuario.apellido ?? "",
            username: interaccion.usuario.username ?? "",
            fotoPerfil: interaccion.usuario.fotoPerfil ?? undefined,
          },
        })),
      };
    });

    // Log para verificar las publicaciones obtenidas (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      console.log("getPublicacionesNegocio: Fetched publicaciones:", publicaciones.length);
      console.log(
        "getPublicacionesNegocio: Publicaciones details:",
        publicaciones.map((pub) => ({
          id: pub.id,
          tipo: pub.tipo,
          visibilidad: pub.visibilidad,
          createdAt: pub.createdAt.toISOString(),
          multimedia: pub.multimedia.map((m) => m.url),
        }))
      );
    }

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