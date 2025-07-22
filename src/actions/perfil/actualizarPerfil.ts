"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { EstadoNegocio } from "@prisma/client";

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
  // const session = await auth();

  // console.log("Validando sesión y usuarioId:", session, usuarioId);

  // // Validar autenticación
  // if (!session || !session.user) {
  //   return { ok: false, message: "No estás autenticado. Por favor, inicia sesión." };
  // }

  // if (session.user.id !== usuarioId) {
  //   return { ok: false, message: "No tienes permiso para actualizar el perfil de este usuario." };
  // }

  console.log("Validando que el negocio existe para el usuario:", usuarioId);
  // Verificar si el negocio existe
  const negocio = await prisma.negocio.findUnique({
    where: { usuarioId },
    select: { id: true, slug: true },
  });
  console.log("Negocio encontrado:", negocio);

  if (!negocio) {
    return { ok: false, message: "El usuario no tiene ningún negocio asociado." };
  }

  const generateSlug = async (nombre: string, ciudad: string): Promise<string> => {
    const randomId = Math.random().toString(36).substring(2, 6);
    const baseSlug = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    let slug = `${baseSlug}-${ciudad.toLowerCase()}-${randomId}`;

    // Verificar unicidad del slug
    let counter = 1;
    while (await prisma.negocio.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${ciudad.toLowerCase()}-${randomId}-${counter}`;
      counter++;
    }

    return slug;
  };

  try {
    // Validaciones adicionales
    console.log("Validación del slug del negocio, coordenadas y categorías...");
    
    
    // 1. Verificar que el slug no esté en uso por otro negocio
    if (data.slugNegocio !== negocio.slug) {
      const existingSlug = await prisma.negocio.findUnique({
        where: { slug: data.slugNegocio },
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

    console.log("Validaciones pasadas, procediendo a actualizar el perfil del negocio...  ");
    const slugNegocio = await generateSlug(data.nombreNegocio, data.ciudadNegocio);

    const tieneUbicacion = !!(data.latitudNegocio && data.longitudNegocio);
    // Preparar los datos para la actualización
    const negocioData = {
      nombre: data.nombreNegocio,
      slug: slugNegocio,
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
      estado: data.estadoNegocio,
    };

    const usuarioData = {
      facebook: data.facebook ?? null,
      instagram: data.instagram ?? null,
      twitter: data.twitter ?? null,
      tiktok: data.tiktok ?? null,
      youtube: data.youtube ?? null,
    };
    console.log("Ejecutando la transacción para actualizar el negocio...");

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

      console.log("Ejecutando la transacción para actualizar el usuario...");

      // Actualizar el usuario
      await tx.usuario.update({
        where: { id: usuarioId },
        data: usuarioData,
      });

      return negocioActualizado;
    });


    console.log("Perfil del negocio actualizado correctamente:", updatedNegocio);
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