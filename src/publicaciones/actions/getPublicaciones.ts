"use server";

import { buildPublicBusinessBySlugWhere } from "@/lib/business/publicBusinessVisibility";
import prisma from "@/lib/prisma";
import { PublicacionTipo, ReaccionTipo } from "@prisma/client";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";

export interface Media {
  id: string;
  url: string;
  tipo: "IMAGEN" | "VIDEO";
  formato?: string;
  orden: number;
}

interface Props {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
  userId?: string | null;  // Corregido: Acepta string | null (resuelve TS2322 con session?.user?.id || null)
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
  userId,  // Recibido como prop (de auth() externa en page.tsx)
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
    // NO auth() aquí: userId se pasa desde Server Component (dinámico fuera de cache)

    // Find the business by slug, including the associated user
    const negocio = await prisma.negocio.findFirst({
      where: buildPublicBusinessBySlugWhere(slug),
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

    // Fetch publications for the business with counters, comments, and review data
    const publicaciones = await prisma.publicacion.findMany({
      where: {
        negocioId: negocio.id,
        tipo: tipo,
        visibilidad: "PUBLICA",
      },
      select: {
        id: true,
        tipo: true,
        titulo: true,
        descripcion: true,
        visibilidad: true,
        createdAt: true,
        numLikes: true,
        numComentarios: true,
        numCompartidos: true,
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
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            username: true,
            fotoPerfil: true,
          },
        },
        interacciones: {
          where: { tipo: "COMENTARIO" },
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            contenido: true,
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
        multimedia: {
          select: {
            id: true,
            url: true,
            tipo: true,
            formato: true,
            orden: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    // Si userId existe (no null/undefined), fetch batch de user reactions (eficiente, O(1))
    let userReactionsMap: Record<string, { id: string; tipo: ReaccionTipo } | null> = {};
    if (userId) {  // Maneja null/undefined como falsy (no fetch)
      const userReactions = await prisma.interaccion.findMany({
        where: {
          usuarioId: userId,
          tipo: "REACCION",
          publicacionId: { in: publicaciones.map((pub) => pub.id) },
        },
        select: {
          id: true,
          publicacionId: true,
          reaccionTipo: true,  // TS infiere como ReaccionTipo | null
        },
      });

      // Type Guard actualizado: Acepta ReaccionTipo | null y maneja null
      const isValidReactionType = (tipo: ReaccionTipo | null): tipo is ReaccionTipo => {
        if (tipo === null) return false;  // Early return para null (TS narrow)
        return ["LIKE", "LOVE", "WOW", "SAD", "ANGRY"].includes(tipo);
      };

      userReactionsMap = userReactions.reduce((map, reaction) => {
        if (isValidReactionType(reaction.reaccionTipo)) {
          // TS ahora narrow a ReaccionTipo (literal union)
          map[reaction.publicacionId] = {
            id: reaction.id,
            tipo: reaction.reaccionTipo,  // Seguro: no 'as' needed
          };
        } else {
          // Fallback seguro si null o inválido (log en dev)
          if (process.env.NODE_ENV === "development") {
            console.warn(`Reacción inválida para pub ${reaction.publicacionId}: tipo ${reaction.reaccionTipo ?? 'null'}`);
          }
          map[reaction.publicacionId] = null;
        }
        return map;
      }, {} as Record<string, { id: string; tipo: ReaccionTipo } | null>);

      // Defaults a null para pubs sin reacción
      publicaciones.forEach((pub) => {
        if (!userReactionsMap[pub.id]) {
          userReactionsMap[pub.id] = null;
        }
      });
    }

    // Transform the data to match EnhancedPublicacion
    const formattedPublicaciones: EnhancedPublicacion[] = publicaciones.map((pub) => {
      // Map comments de interacciones (ahora tipado sin 'any')
      const comments = (pub.interacciones || []).map((inter) => ({
        id: inter.id,
        contenido: inter.contenido ?? "",  // Explícito: ?? "" si null (ajusta si schema permite null)
        createdAt: inter.createdAt.toISOString(),
        usuario: {
          id: inter.usuario.id,
          nombre: inter.usuario.nombre,
          apellido: inter.usuario.apellido ?? "",
          fotoPerfil: inter.usuario.fotoPerfil ?? undefined,
          username: inter.usuario.username ?? "",
        },
      }));

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
        numLikes: pub.numLikes ?? 0,
        numComentarios: pub.numComentarios ?? 0,
        numCompartidos: pub.numCompartidos ?? 0,
        userReaction: userReactionsMap[pub.id] ?? null,
        comments,
        isAuthenticated: !!userId,
        onInteraction: undefined,
        calificacion: pub.calificacion ?? undefined, // Corregido: Convertir null a undefined para EnhancedPublicacion
        producto: pub.productosEnPublicacion?.length > 0 ? { // Nuevo: producto asociado si es reseña
          id: pub.productosEnPublicacion[0].producto.id,
          nombre: pub.productosEnPublicacion[0].producto.nombre,
          slug: pub.productosEnPublicacion[0].producto.slug,
        } : undefined,
      };
    });

    // Logs en dev
    if (process.env.NODE_ENV === "development") {
      console.log("getPublicacionesNegocio: Fetched publicaciones:", publicaciones.length);
      console.log("userId recibido como prop:", userId);  // Debug: Confirma paso desde page.tsx
      console.log("UserReactionsMap sample:", Object.keys(userReactionsMap).slice(0, 2));  // Solo sample para no spamear
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
