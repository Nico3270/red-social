"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { EstadoNegocio } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

interface InformacionInicialNegocio {
  nombreNegocio: string;
  slugNegocio: string;
  descripcionNegocio: string;
  telefonoNegocio: string; // Mapea a telefonoContacto en Negocio
  ciudadNegocio: string;
  departamentoNegocio: string;
  direccionNegocio?: string;
  telefonoContacto?: string;
  imagenPerfil?: string;
  imagenPortada?: string;
  sitioWeb?: string;
  urlGoogleMaps?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  latitudNegocio: number;
  longitudNegocio: number;
  categoriaIds: string[];
  seccionesIds: string[];
  estadoNegocio: EstadoNegocio;
  idNegocio?: string; // Opcional, si se necesita el ID del negocio
}

interface DatosPerfilNegocio {
  ok: boolean;
  message: string;
  negocio?: InformacionInicialNegocio;
}

// Constantes para valores por defecto
const DEFAULT_LATITUDE = 4.710989; // Bogotá
const DEFAULT_LONGITUDE = -74.07209;

export const actualizarPerfilNegocio = async (
  usuarioId: string,
  data: InformacionInicialNegocio
): Promise<DatosPerfilNegocio> => {
  try {
    const session = await auth();
    const authenticatedUserId = session?.user?.id;

    if (!authenticatedUserId) {
      return {
        ok: false,
        message: "No autorizado. Debes iniciar sesión.",
      };
    }

    if (usuarioId && usuarioId !== authenticatedUserId) {
      return {
        ok: false,
        message: "No tienes permiso para actualizar el perfil de este usuario.",
      };
    }

    const negocio = data.idNegocio
      ? await prisma.negocio.findUnique({
          where: { id: data.idNegocio },
          select: { id: true, slug: true, usuarioId: true },
        })
      : await prisma.negocio.findUnique({
          where: { usuarioId: authenticatedUserId },
          select: { id: true, slug: true, usuarioId: true },
        });

    if (!negocio) {
      return {
        ok: false,
        message: data.idNegocio
          ? "El negocio especificado no existe."
          : "El usuario no tiene ningún negocio asociado.",
      };
    }

    if (negocio.usuarioId !== authenticatedUserId) {
      return {
        ok: false,
        message: "No tienes permiso para actualizar este negocio.",
      };
    }

    const oldSlug = negocio.slug;

    // Validaciones adicionales
    // console.log("Validación del slug del negocio, coordenadas y categorías...");


    // 1. Verificar que el slug no esté en uso por otro negocio
    const slugNegocio = data.slugNegocio; // Usa el proporcionado, no generes nuevo
    if (slugNegocio !== negocio.slug) {
      const existingSlug = await prisma.negocio.findUnique({
        where: { slug: slugNegocio }, // Cambia a slugNegocio
        select: { id: true },
      });
      if (existingSlug && existingSlug.id !== negocio.id) {
        return { ok: false, message: "El slug ya está en uso por otro negocio." };
      }

    }

    // 2. Validar coordenadas
    if (
      data.latitudNegocio < -90 ||
      data.latitudNegocio > 90 ||
      data.longitudNegocio < -180 ||
      data.longitudNegocio > 180
    ) {
      return { ok: false, message: "Las coordenadas proporcionadas no son válidas." };
    }

    // 3. Verificar que las categorías existen
    if (data.categoriaIds.length > 0) {
      const categoriasExistentes = await prisma.category.count({
        where: { id: { in: data.categoriaIds } },
      });
      if (categoriasExistentes !== data.categoriaIds.length) {
        return { ok: false, message: "Una o más categorías proporcionadas no existen." };
      }
    }

    // 4. Verificar que las secciones existen
    if (data.seccionesIds.length > 0) {
      const seccionesExistentes = await prisma.section.count({
        where: { id: { in: data.seccionesIds } },
      });
      if (seccionesExistentes !== data.seccionesIds.length) {
        return { ok: false, message: "Una o más secciones proporcionadas no existen." };
      }
    }

    // console.log("Validaciones pasadas, procediendo a actualizar el perfil del negocio...  ");


    const tieneUbicacion = !!(data.latitudNegocio && data.longitudNegocio);
    // Preparar los datos para la actualización
    const negocioData = {
      nombre: data.nombreNegocio,
      slug: data.slugNegocio, // Mantiene el original
      descripcion: data.descripcionNegocio,
      telefonoContacto: data.telefonoNegocio,
      ciudad: data.ciudadNegocio,
      departamento: data.departamentoNegocio,
      direccion: data.direccionNegocio ?? null,
      urlGoogleMaps: tieneUbicacion
        ? `https://www.google.com/maps?q=${data.latitudNegocio},${data.longitudNegocio}`
        : null,
      latitud: data.latitudNegocio,
      longitud: data.longitudNegocio,
      fotoPerfil: data.imagenPerfil ?? null,
      fotoPortada: data.imagenPortada ?? null,
      sitioWeb: data.sitioWeb ?? null,
      // El estado operacional del negocio es administrado por Myckeo/admin.
      // La edición normal del dueño acepta el campo por compatibilidad, pero no lo persiste.
    };

    const usuarioData = {
      facebook: data.facebook ?? null,
      instagram: data.instagram ?? null,
      twitter: data.twitter ?? null,
      tiktok: data.tiktok ?? null,
      youtube: data.youtube ?? null,
    };
    // console.log("Ejecutando la transacción para actualizar el negocio...");

    // Ejecutar la transacción
    const updatedNegocio = await prisma.$transaction(async (tx) => {
      // Actualizar el negocio
      const negocioActualizado = await tx.negocio.update({
        where: { id: negocio.id },
        data: {
          ...negocioData,
          categorias: {
            deleteMany: {}, // Eliminar todas las categorías actuales
            create: data.categoriaIds.map((categoryId) => ({
              categoryId,
            })),
          },
          secciones: {
            deleteMany: {}, // Eliminar todas las secciones actuales
            create: data.seccionesIds.map((sectionId) => ({
              sectionId,
              prioridad: 0, // Asignar prioridad por defecto
            })),
          },
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          descripcion: true,
          telefonoContacto: true,
          ciudad: true,
          departamento: true,
          direccion: true,
          urlGoogleMaps: true,
          latitud: true,
          longitud: true,
          fotoPerfil: true,
          fotoPortada: true,
          sitioWeb: true,
          estado: true,
          categorias: { select: { categoryId: true } },
          secciones: { select: { sectionId: true } },
        },
      });

      // console.log("Ejecutando la transacción para actualizar el usuario...");

      // Actualizar el usuario
      await tx.usuario.update({
        where: { id: authenticatedUserId },
        data: usuarioData,
      });

      return negocioActualizado;
    });

    const newSlug = updatedNegocio.slug;
    const slugsToRevalidate = new Set([oldSlug, newSlug].filter(Boolean));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/editar-perfil");

    for (const slug of slugsToRevalidate) {
      revalidatePath(`/perfil/${slug}`);
      revalidateTag(`negocio-catalog-${slug}`);
      revalidateTag(`negocio-publications-${slug}`);
    }

    // console.log("Perfil del negocio actualizado correctamente:", updatedNegocio);
    // Formatear el negocio actualizado para el frontend
    const negocioFormateado: InformacionInicialNegocio = {
      nombreNegocio: updatedNegocio.nombre,
      slugNegocio: updatedNegocio.slug,
      descripcionNegocio: updatedNegocio.descripcion ?? "",
      telefonoNegocio: updatedNegocio.telefonoContacto ?? "",
      ciudadNegocio: updatedNegocio.ciudad,
      departamentoNegocio: updatedNegocio.departamento,
      direccionNegocio: updatedNegocio.direccion ?? undefined,
      telefonoContacto: updatedNegocio.telefonoContacto ?? undefined,
      imagenPerfil: updatedNegocio.fotoPerfil ?? undefined,
      imagenPortada: updatedNegocio.fotoPortada ?? undefined,
      sitioWeb: updatedNegocio.sitioWeb ?? undefined,
      urlGoogleMaps: updatedNegocio.urlGoogleMaps ?? undefined,
      facebook: data.facebook ?? undefined,
      instagram: data.instagram ?? undefined,
      twitter: data.twitter ?? undefined,
      tiktok: data.tiktok ?? undefined,
      youtube: data.youtube ?? undefined,
      latitudNegocio: updatedNegocio.latitud ?? DEFAULT_LATITUDE,
      longitudNegocio: updatedNegocio.longitud ?? DEFAULT_LONGITUDE,
      categoriaIds: updatedNegocio.categorias.map((cat) => cat.categoryId),
      seccionesIds: updatedNegocio.secciones.map((sec) => sec.sectionId),
      estadoNegocio: updatedNegocio.estado,
      idNegocio: updatedNegocio.id, // Incluimos el ID del negocio actualizado  
    };

    return {
      ok: true,
      message: "Perfil actualizado correctamente.",
      negocio: negocioFormateado,
    };
  } catch (error) {
    console.error("Error al actualizar el perfil del negocio:", error);
    return {
      ok: false,
      message: `Error al actualizar el perfil: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
};
