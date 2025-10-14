import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";

export interface ServiciosNegocioResult {
  ok: boolean;
  message: string;
  servicios: ServicioData[];
}

export const getServiciosBySlug = async (slug: string, take: number = 4): Promise<ServiciosNegocioResult> => {
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: {
        id: true,
        nombre: true,
        slug: true,
        fotoPerfil: true,
        telefonoContacto: true,
      },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
        servicios: [],
      };
    }

    const servicios = await prisma.servicio.findMany({
      where: {
        negocioId: negocio.id,
        status: "disponible",
      },
      take,
      orderBy: [
        { orden: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        slug: true,
        precio: true,
        currency: true,
        status: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        negocioId: true,
        multimedia: {
          select: {
            url: true,
            orden: true,
            tipo: true,
          },
        },
      },
    });

    const serviciosFormateados: ServicioData[] = servicios.map(servicio => ({
      id: servicio.id,
      titulo: servicio.titulo,
      descripcion: servicio.descripcion || [],
      slug: servicio.slug,
      precio: servicio.precio || undefined,
      currency: servicio.currency,
      status: servicio.status,
      tags: servicio.tags,
      multimedia: servicio.multimedia.map(media => ({
        url: media.url,
        orden: media.orden,
        tipo: media.tipo,
      })),
      negocioId: negocio.id,
      negocioSlug: negocio.slug,
      nombreNegocio: negocio.nombre,
      telefonoNegocio: negocio.telefonoContacto || "",
      negocioFotoPerfil: negocio.fotoPerfil || "",
    }));

    return {
      ok: true,
      message: "Servicios obtenidos correctamente",
      servicios: serviciosFormateados,
    };
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    return {
      ok: false,
      message: "Error al obtener servicios",
      servicios: [],
    };
  }
};

export const getCachedServiciosBySlug = (slug: string) =>
  unstable_cache(
    async (take: number) => getServiciosBySlug(slug, take),
    [`negocio-services-teaser-${slug}`],
    {
      revalidate: 3600,
    }
  );