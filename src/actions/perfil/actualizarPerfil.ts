"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { profileEditorSchema } from "@/lib/business/profileEditor";
import { validProfileLocation } from "@/lib/business/profileLocation";
import type { InformacionInicialNegocio } from "@/lib/business/profileEditor";
import { revalidatePath, revalidateTag } from "next/cache";

interface DatosPerfilNegocio {
  ok: boolean;
  message: string;
  negocio?: InformacionInicialNegocio;
}

const profileSelection = {
  id: true,
  slug: true,
  usuarioId: true,
  latitud: true,
  longitud: true,
  categorias: { select: { categoryId: true } },
  secciones: { select: { sectionId: true } },
} as const;

const sameIds = (current: string[], next: string[]) =>
  current.length === next.length && current.every((id) => next.includes(id));
const optionalText = (value: string | undefined) =>
  value === undefined ? undefined : value || null;

export const actualizarPerfilNegocio = async (
  usuarioId: string,
  data: InformacionInicialNegocio,
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

    const validated = profileEditorSchema.safeParse(data);
    if (!validated.success) {
      return {
        ok: false,
        message:
          validated.error.issues[0]?.message ||
          "Revisa los datos del formulario.",
      };
    }
    data = validated.data;

    const negocio = data.idNegocio
      ? await prisma.negocio.findUnique({
          where: { id: data.idNegocio },
          select: profileSelection,
        })
      : await prisma.negocio.findUnique({
          where: { usuarioId: authenticatedUserId },
          select: profileSelection,
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
        return {
          ok: false,
          message: "El slug ya está en uso por otro negocio.",
        };
      }
    }

    // 3. Verificar que las categorías existen
    if (data.categoriaIds.length > 0) {
      const categoriasExistentes = await prisma.category.count({
        where: { id: { in: data.categoriaIds } },
      });
      if (categoriasExistentes !== data.categoriaIds.length) {
        return {
          ok: false,
          message: "Una o más categorías proporcionadas no existen.",
        };
      }
    }

    // 4. Verificar que las secciones existen
    if (data.seccionesIds.length > 0) {
      const seccionesExistentes = await prisma.section.count({
        where: { id: { in: data.seccionesIds } },
      });
      if (seccionesExistentes !== data.seccionesIds.length) {
        return {
          ok: false,
          message: "Una o más secciones proporcionadas no existen.",
        };
      }
    }

    // console.log("Validaciones pasadas, procediendo a actualizar el perfil del negocio...  ");

    const location = validProfileLocation(
      data.latitudNegocio,
      data.longitudNegocio,
    );
    const locationChanged =
      location &&
      (location.lat !== negocio.latitud || location.lng !== negocio.longitud);
    // La ausencia de ubicación no borra coordenadas existentes; solo una selección válida las cambia.
    const locationData = locationChanged
      ? {
          latitud: location.lat,
          longitud: location.lng,
          urlGoogleMaps: `https://www.google.com/maps?q=${location.lat},${location.lng}`,
        }
      : { urlGoogleMaps: optionalText(data.urlGoogleMaps) };
    // Preparar los datos para la actualización
    const negocioData = {
      nombre: data.nombreNegocio,
      slug: data.slugNegocio, // Mantiene el original
      descripcion: data.descripcionNegocio,
      telefonoContacto: data.telefonoNegocio,
      ciudad: data.ciudadNegocio,
      departamento: data.departamentoNegocio,
      direccion: optionalText(data.direccionNegocio),
      ...locationData,
      fotoPerfil: optionalText(data.imagenPerfil),
      fotoPortada: optionalText(data.imagenPortada),
      sitioWeb: optionalText(data.sitioWeb),
      // El estado operacional del negocio es administrado por Myckeo/admin.
      // La edición normal del dueño acepta el campo por compatibilidad, pero no lo persiste.
    };

    const usuarioData = {
      facebook: optionalText(data.facebook),
      instagram: optionalText(data.instagram),
      twitter: optionalText(data.twitter),
      tiktok: optionalText(data.tiktok),
      youtube: optionalText(data.youtube),
    };
    // console.log("Ejecutando la transacción para actualizar el negocio...");

    // Ejecutar la transacción
    const updatedNegocio = await prisma.$transaction(async (tx) => {
      // Actualizar el negocio
      const negocioActualizado = await tx.negocio.update({
        where: { id: negocio.id },
        data: {
          ...negocioData,
          ...(sameIds(
            negocio.categorias.map((item) => item.categoryId),
            data.categoriaIds,
          )
            ? {}
            : {
                categorias: {
                  deleteMany: {},
                  create: data.categoriaIds.map((categoryId) => ({
                    categoryId,
                  })),
                },
              }),
          ...(sameIds(
            negocio.secciones.map((item) => item.sectionId),
            data.seccionesIds,
          )
            ? {}
            : {
                secciones: {
                  deleteMany: {},
                  create: data.seccionesIds.map((sectionId) => ({
                    sectionId,
                    prioridad: 0,
                  })),
                },
              }),
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
      latitudNegocio: updatedNegocio.latitud ?? null,
      longitudNegocio: updatedNegocio.longitud ?? null,
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
      message:
        "No pudimos guardar los cambios. Tus datos siguen en el formulario; inténtalo nuevamente.",
    };
  }
};
