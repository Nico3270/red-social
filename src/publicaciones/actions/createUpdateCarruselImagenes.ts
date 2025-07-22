"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { Prisma, PublicacionTipo, Visibilidad, MultimediaTipo } from "@prisma/client";

interface InformacionPublicacion {
  usuarioId?: string;
  negocioId?: string | undefined;
  publicacionId?: string;
  tipo: PublicacionTipo;
  descripcion?: string;
  multimedia?: string[];
  visibilidad?: Visibilidad;
}

interface CreateCarruselImagenesResult {
  ok: boolean;
  message: string;
  publicacion?: InformacionPublicacion;
}

export const createUpdateCarruselImagenes = async (
  data: InformacionPublicacion
): Promise<CreateCarruselImagenesResult> => {
  try {
    const session = await auth();

    // Validar autenticación
    if (!session || !session.user.id) {
      return {
        ok: false,
        message: "Debes estar autenticado para crear o actualizar una publicación",
      };
    }

    // Determinar negocioId para usuarios con rol "negocio"
    let negocioId: string | null = data.negocioId || null;
    if (session.user.role === "negocio" && !data.negocioId) {
      const negocio = await prisma.negocio.findUnique({
        where: { usuarioId: session.user.id },
        select: { id: true },
      });
      if (!negocio) {
        return {
          ok: false,
          message: "No se encontró un negocio asociado a este usuario",
        };
      }
      negocioId = negocio.id;
    }

    // Preparar datos de la publicación
    const publicacionData: Prisma.PublicacionCreateInput = {
      usuario: { connect: { id: session.user.id } }, // usuarioId no puede ser undefined
      negocio: negocioId ? { connect: { id: negocioId } } : undefined,
      tipo: data.tipo || PublicacionTipo.CARRUSEL_IMAGENES,
      descripcion: data.descripcion || "",
      visibilidad: data.visibilidad || Visibilidad.PUBLICA,
      multimedia: {
        create: (data.multimedia || []).map((url, index) => ({
          url,
          tipo: url.includes(".mp4") || url.includes(".mov") ? MultimediaTipo.VIDEO : MultimediaTipo.IMAGEN,
          formato: url.includes(".mp4") || url.includes(".mov") ? "video/mp4" : "image/jpeg",
          orden: index,
        })),
      },
    };

    let publicacion: Prisma.PublicacionGetPayload<{ include: { multimedia: true } }>;

    if (!data.publicacionId) {
      // Crear nueva publicación
      publicacion = await prisma.publicacion.create({
        data: publicacionData,
        include: { multimedia: true },
      });
    } else {
      // Verificar que la publicación existe y pertenece al usuario
      const existingPublicacion = await prisma.publicacion.findUnique({
        where: { id: data.publicacionId },
        select: { usuarioId: true },
      });

      if (!existingPublicacion || existingPublicacion.usuarioId !== session.user.id) {
        return {
          ok: false,
          message: "No tienes permiso para editar esta publicación o no existe",
        };
      }

      // Actualizar publicación existente
      publicacion = await prisma.publicacion.update({
        where: { id: data.publicacionId },
        data: {
          descripcion: publicacionData.descripcion,
          visibilidad: publicacionData.visibilidad,
          multimedia: {
            deleteMany: {}, // Eliminar multimedia existente
            create: (data.multimedia || []).map((url, index) => ({
              url,
              tipo: url.includes(".mp4") || url.includes(".mov") ? MultimediaTipo.VIDEO : MultimediaTipo.IMAGEN,
              formato: url.includes(".mp4") || url.includes(".mov") ? "video/mp4" : "image/jpeg",
              orden: index,
            })),
          },
        },
        include: { multimedia: true },
      });
    }

    // Formatear la respuesta
    const publicacionResponse: InformacionPublicacion = {
      usuarioId: publicacion.usuarioId,
      negocioId: publicacion.negocioId || undefined,
      publicacionId: publicacion.id,
      tipo: publicacion.tipo,
      descripcion: publicacion.descripcion || undefined,
      multimedia: publicacion.multimedia.map((media) => media.url),
      visibilidad: publicacion.visibilidad,
    };

    return {
      ok: true,
      message: data.publicacionId
        ? "Publicación actualizada exitosamente"
        : "Publicación creada exitosamente",
      publicacion: publicacionResponse,
    };
  } catch (error) {
    console.error("Error en createUpdateCarruselImagenes:", error);
    return {
      ok: false,
      message: "Ocurrió un error al procesar la publicación",
    };
  }
};