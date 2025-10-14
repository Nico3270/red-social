
// app/actions/perfil/getConteosSecciones.ts

"use server";

import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getConteosSecciones = async (slug: string) => {
  try {
    // Validar slug
    if (!slug) {
      return {
        ok: false,
        message: "Slug del negocio es requerido",
        servicios: 0,
        resenas: 0,
        publicaciones: 0,
        productos: 0,
      };
    }

    // Consultar el negocio para verificar existencia
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
        servicios: 0,
        resenas: 0,
        publicaciones: 0,
        productos: 0,
      };
    }

    // Cachear consultas individuales
    const getCachedServiciosCount = unstable_cache(
      async (negocioId: string) =>
        prisma.servicio.count({
          where: {
            negocioId,
            status: "disponible", // Contar solo servicios disponibles
          },
        }),
      ["servicios-count", slug],
      { revalidate: 3600, tags: [`servicios-count-${slug}`] }
    );

    const getCachedResenasCount = unstable_cache(
      async (negocioId: string) =>
        prisma.publicacion.count({
          where: {
            negocioId,
            tipo: "TESTIMONIO",
            productosEnPublicacion: {
              some: { esResena: true }, // Contar publicaciones con producto asociado y esResena
            },
          },
        }),
      ["resenas-count", slug],
      { revalidate: 3600, tags: [`resenas-count-${slug}`] }
    );

    const getCachedPublicacionesCount = unstable_cache(
      async (negocioId: string) =>
        prisma.publicacion.count({
          where: {
            negocioId,
            visibilidad: "PUBLICA", // Contar solo publicaciones públicas
          },
        }),
      ["publicaciones-count", slug],
      { revalidate: 60, tags: [`publicaciones-count-${slug}`] }
    );

    const getCachedProductosCount = unstable_cache(
      async (negocioId: string) =>
        prisma.product.count({
          where: {
            negocioId,
            status: "disponible", // Contar solo productos disponibles
          },
        }),
      ["productos-count", slug],
      { revalidate: 3600, tags: [`productos-count-${slug}`] }
    );

    // Ejecutar consultas cacheadas en paralelo
    const [serviciosCount, resenasCount, publicacionesCount, productosCount] = await Promise.all([
      getCachedServiciosCount(negocio.id),
      getCachedResenasCount(negocio.id),
      getCachedPublicacionesCount(negocio.id),
      getCachedProductosCount(negocio.id),
    ]);

    return {
      ok: true,
      message: "Conteos obtenidos exitosamente",
      servicios: serviciosCount,
      resenas: resenasCount,
      publicaciones: publicacionesCount,
      productos: productosCount,
    };
  } catch (error) {
    console.error("Error en getConteosSecciones:", error);
    return {
      ok: false,
      message: "Error al obtener conteos de secciones",
      servicios: 0,
      resenas: 0,
      publicaciones: 0,
      productos: 0,
    };
  }
};