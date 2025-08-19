"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { Currency, ServicioStatus, MultimediaTipo } from "@prisma/client";
import slugify from "slugify";
import shortid from "shortid";
import { ServicioData } from "../interfaces/servicios.interface";

interface CreateUpdateServicioResult {
  ok: boolean;
  message: string;
  servicio?: ServicioData;
}

export const createUpdateServicio = async (
  data: ServicioData
): Promise<CreateUpdateServicioResult> => {
  try {
    const session = await auth();
    if (!session || !session.user.id) {
      return {
        ok: false,
        message: "Debes estar autenticado para crear o actualizar un servicio",
      };
    }

    let negocioId = data.negocioId || session.user.negocioId;
    if (!negocioId) {
      return {
        ok: false,
        message: "El ID del negocio es requerido",
      };
    }

    // Validar existencia del Negocio
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
    });
    if (!negocio) {
      return {
        ok: false,
        message: "El negocio especificado no existe",
      };
    }

    // Preparar datos del servicio
    const servicioData = {
      titulo: data.titulo,
      descripcion: data.descripcion || [],
      precio: data.precio,
      currency: data.currency || Currency.COP,
      status: data.status || ServicioStatus.disponible,
      tags: data.tags || [],
    };

    let servicio;

    if (!data.id) {
      // Crear nuevo servicio
      const generatedSlug = `${slugify(data.titulo, { lower: true, strict: true })}-${shortid.generate()}`;
      servicio = await prisma.servicio.create({
        data: {
          ...servicioData,
          slug: generatedSlug,
          negocioId,
          multimedia: {
            create: (data.multimedia || []).map((item) => ({
              url: item.url,
              tipo: item.tipo || (item.url.includes(".mp4") || item.url.includes(".mov") ? MultimediaTipo.VIDEO : MultimediaTipo.IMAGEN),
              formato: item.url.includes(".mp4") || item.url.includes(".mov") ? "video/mp4" : "image/jpeg",
              orden: item.orden,
            })),
          },
        },
        include: { multimedia: true },
      });
    } else {
      // Verificar servicio
      const existingServicio = await prisma.servicio.findUnique({
        where: { id: data.id },
        select: { negocioId: true },
      });

      if (!existingServicio || existingServicio.negocioId !== negocioId) {
        return {
          ok: false,
          message: "No tienes permiso para editar este servicio o no existe",
        };
      }

      // Actualizar servicio
      servicio = await prisma.servicio.update({
        where: { id: data.id },
        data: {
          ...servicioData,
          multimedia: {
            deleteMany: {}, // Eliminar existente
            create: (data.multimedia || []).map((item) => ({
              url: item.url,
              tipo: item.tipo || (item.url.includes(".mp4") || item.url.includes(".mov") ? MultimediaTipo.VIDEO : MultimediaTipo.IMAGEN),
              formato: item.url.includes(".mp4") || item.url.includes(".mov") ? "video/mp4" : "image/jpeg",
              orden: item.orden,
            })),
          },
        },
        include: { multimedia: true },
      });
    }

    // Formatear respuesta con MediaItem
    const servicioResponse: ServicioData = {
      id: servicio.id,
      titulo: servicio.titulo,
      descripcion: servicio.descripcion,
      precio: servicio.precio ?? undefined,
      currency: servicio.currency ?? undefined,
      status: servicio.status ?? undefined,
      tags: servicio.tags ?? undefined,
      multimedia: servicio.multimedia.map((media) => ({
        url: media.url,
        orden: media.orden,
        tipo: media.tipo === MultimediaTipo.VIDEO ? 'VIDEO' : 'IMAGEN',
      })),
      negocioId: servicio.negocioId,
    };

    return {
      ok: true,
      message: data.id
        ? "Servicio actualizado exitosamente"
        : "Servicio creado exitosamente",
      servicio: servicioResponse,
    };
  } catch (error) {
    console.error("Error en createUpdateServicio:", error);
    return {
      ok: false,
      message: "Ocurrió un error al procesar el servicio",
    };
  }
};