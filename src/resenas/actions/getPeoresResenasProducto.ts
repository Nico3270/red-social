"use server";

import { buildPublicBusinessRelationWhere } from "@/lib/business/publicBusinessVisibility";
import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { PublicacionTipo, ReaccionTipo } from "@prisma/client";

export interface ResenaProducto {
  id: string;
  descripcion?: string;
  multimedia: { id: string; url: string; tipo: "IMAGEN" | "VIDEO"; orden: number }[];
  calificacion?: number;
  visibilidad: "PUBLICA" | "PRIVADA" | "AMIGOS";
  createdAt: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    fotoPerfil?: string;
    username: string;
  };
  negocio?: {
    id: string;
    nombre: string;
    slug?: string;
    fotoPerfil?: string;
  };
  userReaction?: { id: string; tipo: ReaccionTipo } | null;
  comments: Array<{
    id: string;
    contenido: string;
    createdAt: string;
    usuario: { id: string; nombre: string; apellido: string; fotoPerfil?: string; username: string };
  }>;
}

interface GetPeoresResenasProductoResult {
  ok: boolean;
  message: string;
  resenas?: ResenaProducto[];
}

export const getPeoresResenasProducto = async (productSlug: string, take = 10): Promise<GetPeoresResenasProductoResult> => {
  if (!productSlug || typeof productSlug !== "string" || productSlug.trim() === "") {
    return { ok: false, message: "Slug del producto inválido o requerido" };
  }

  const session = await auth();
  const usuarioId = session?.user?.id || null;

  try {
    const producto = await prisma.product.findFirst({
      where: {
        slug: productSlug,
        negocio: buildPublicBusinessRelationWhere(),
      },
      select: { id: true, negocioId: true },
    });

    if (!producto) {
      return { ok: false, message: "Producto no encontrado" };
    }

    const publicaciones = await prisma.publicacion.findMany({
      where: {
        tipo: PublicacionTipo.TESTIMONIO,
        productosEnPublicacion: {
          some: {
            productoId: producto.id,
            esResena: true,
          },
        },
        visibilidad: "PUBLICA",
        calificacion: { not: null }, // Solo reseñas con calificación
        negocio: buildPublicBusinessRelationWhere(),
      },
      select: {
        id: true,
        descripcion: true,
        calificacion: true,
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
            slug: true,
            fotoPerfil: true,
          },
        },
        multimedia: {
          select: {
            id: true,
            url: true,
            tipo: true,
            orden: true,
          },
          orderBy: { orden: "asc" },
        },
        interacciones: {
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
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [
        { calificacion: "asc" }, // Primero las de menor calificación
        { createdAt: "desc" }, // Secundario: más recientes
      ],
      take,
    });

    const resenas: ResenaProducto[] = publicaciones.map((pub) => {
      const userReaction = pub.interacciones.find((inter) => inter.tipo === "REACCION" && inter.usuario.id === usuarioId);
      
      return {
        id: pub.id,
        descripcion: pub.descripcion || undefined,
        multimedia: pub.multimedia.map((media) => ({
          id: media.id,
          url: media.url,
          tipo: media.tipo,
          orden: media.orden,
        })),
        calificacion: pub.calificacion || undefined,
        visibilidad: pub.visibilidad,
        createdAt: pub.createdAt.toISOString(),
        numLikes: pub.numLikes,
        numComentarios: pub.numComentarios,
        numCompartidos: pub.numCompartidos,
        usuario: {
          id: pub.usuario.id,
          nombre: pub.usuario.nombre,
          apellido: pub.usuario.apellido || "",
          fotoPerfil: pub.usuario.fotoPerfil ?? undefined,
          username: pub.usuario.username || "",
        },
        negocio: pub.negocio
          ? {
              id: pub.negocio.id,
              nombre: pub.negocio.nombre,
              slug: pub.negocio.slug || undefined,
              fotoPerfil: pub.negocio.fotoPerfil ?? undefined,
            }
          : undefined,
        userReaction: userReaction ? { id: userReaction.id, tipo: userReaction.reaccionTipo! } : null,
        comments: pub.interacciones
          .filter((inter) => inter.tipo === "COMENTARIO")
          .map((comment) => ({
            id: comment.id,
            contenido: comment.contenido || "",
            createdAt: comment.createdAt.toISOString(),
            usuario: {
              id: comment.usuario.id,
              nombre: comment.usuario.nombre,
              apellido: comment.usuario.apellido || "",
              fotoPerfil: comment.usuario.fotoPerfil ?? undefined,
              username: comment.usuario.username || "",
            },
          })),
      };
    });

    return {
      ok: true,
      message: "Peores reseñas obtenidas exitosamente",
      resenas,
    };
  } catch (error) {
    console.error("Error en getPeoresResenasProducto:", error);
    return {
      ok: false,
      message: `Error al obtener las peores reseñas: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
};
