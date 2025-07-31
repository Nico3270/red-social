"use server";

import prisma from "@/lib/prisma";
import { Prisma, PublicacionTipo } from "@prisma/client";

interface Media {
  id: string;
  url: string;
  tipo: "IMAGEN" | "VIDEO";
  formato?: string;
  orden: number;
}

interface User {
  id: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string;
  username: string;
}

interface EnhancedPublicacion {
  id: string;
  usuario: User;
  negocio?: { id: string; nombre: string; fotoPerfil?: string, slug:string };
  tipo: "CARRUSEL_IMAGENES" | "VIDEO_HORIZONTAL" | "VIDEO_VERTICAL" | "PRODUCTO_DESTACADO" | "MINI_GRID" | "TESTIMONIO";
  titulo?: string;
  descripcion?: string;
  multimedia: Media[];
  visibilidad: "PUBLICA" | "PRIVADA" | "AMIGOS";
  createdAt: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: { id: string; tipo: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" } | null;
  comments: Array<{
    id: string;
    contenido: string;
    createdAt: string;
    usuario: {
      id: string;
      nombre: string;
      apellido: string;
      fotoPerfil?: string;
      username: string;
    };
  }>;
}

interface DataSalida {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

export const getPublicacionesCarrusel = async (currentUserId?: string): Promise<DataSalida> => {
  try {
    const resultado = await prisma.publicacion.findMany({
      where: {
        tipo: PublicacionTipo.CARRUSEL_IMAGENES,
      },
      orderBy: {
        createdAt: "desc",
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
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfil: true,
            username: true,
          },
        },
        negocio: {
          select: {
            id: true,
            nombre: true,
            fotoPerfil: true,
            slug: true
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
          orderBy: {
            orden: "asc",
          },
        },
        interacciones: {
  where: {
    OR: [
      { tipo: "COMENTARIO" },
      { tipo: "REACCION" }, // todas las reacciones
    ],
  },
          select: {
            id: true,
            tipo: true,
            reaccionTipo: true,
            contenido: true,
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
          take: currentUserId ? undefined : 3, // Si no hay usuario, limitar comentarios a 3
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const publicacionesFormateadas: EnhancedPublicacion[] = resultado.map((publicacion) => {
      const userReaction = publicacion.interacciones
        .filter((i) => i.tipo === "REACCION" && i.usuario.id === currentUserId)
        .map((i) => ({
          id: i.id,
          tipo: i.reaccionTipo as "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY",
        }))[0] || null;

      const comments = publicacion.interacciones
        .filter((i) => i.tipo === "COMENTARIO")
        .slice(0, 3)
        .map((i) => ({
          id: i.id,
          contenido: i.contenido!,
          createdAt: i.createdAt.toISOString(),
          usuario: {
            id: i.usuario.id,
            nombre: i.usuario.nombre,
            apellido: i.usuario.apellido,
            fotoPerfil: i.usuario.fotoPerfil ?? undefined,
            username: i.usuario.username,
          },
        }));

      return {
        id: publicacion.id,
        usuario: {
          id: publicacion.usuario.id,
          nombre: publicacion.usuario.nombre,
          apellido: publicacion.usuario.apellido,
          fotoPerfil: publicacion.usuario.fotoPerfil ?? undefined,
          username: publicacion.usuario.username,
        },
        negocio: publicacion.negocio
          ? {
              id: publicacion.negocio.id,
              nombre: publicacion.negocio.nombre,
              fotoPerfil: publicacion.negocio.fotoPerfil ?? undefined,
              slug: publicacion.negocio.slug
            }
          : undefined,
        tipo: publicacion.tipo as
          | "CARRUSEL_IMAGENES"
          | "VIDEO_HORIZONTAL"
          | "VIDEO_VERTICAL"
          | "PRODUCTO_DESTACADO"
          | "MINI_GRID"
          | "TESTIMONIO",
        titulo: publicacion.titulo ?? undefined,
        descripcion: publicacion.descripcion ?? undefined,
        multimedia: publicacion.multimedia.map((media) => ({
          id: media.id,
          url: media.url,
          tipo: media.tipo as "IMAGEN" | "VIDEO",
          formato: media.formato ?? undefined,
          orden: media.orden,
        })),
        visibilidad: publicacion.visibilidad as "PUBLICA" | "PRIVADA" | "AMIGOS",
        createdAt: publicacion.createdAt.toISOString(),
        numLikes: publicacion.numLikes,
        numComentarios: publicacion.numComentarios,
        numCompartidos: publicacion.numCompartidos,
        userReaction,
        comments,
      };
    });

    return {
      ok: true,
      message: publicacionesFormateadas.length
        ? "Publicaciones obtenidas exitosamente"
        : "No se encontraron publicaciones de tipo CARRUSEL_IMAGENES",
      publicaciones: publicacionesFormateadas,
    };
  } catch (error) {
    console.error("Error en getPublicacionesCarrusel:", error);
    return {
      ok: false,
      message: "Ocurrió un error al obtener las publicaciones",
      publicaciones: [],
    };
  }
};