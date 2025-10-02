"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { PublicacionTipo, Visibilidad } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CreateResenaProductoProps {
  publicacionId?: string;
  productoId: string;
  negocioId?: string;
  descripcion?: string;
  multimedia: string[];
  calificacion: number;
  visibilidad?: Visibilidad;
}

export interface CreateResenaProductoResult {
  ok: boolean;
  message: string;
  publicacionId?: string;
  ratingPromedio?: number;
  numResenas?: number;
}

export const createResenaProducto = async ({
  publicacionId,
  productoId,
  negocioId,
  descripcion,
  multimedia,
  calificacion,
  visibilidad = Visibilidad.PUBLICA,
}: CreateResenaProductoProps): Promise<CreateResenaProductoResult> => {
  // Validaciones de inputs
  console.log("createResenaProducto: productoId recibido =", productoId); // Log para depuración
  if (!productoId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productoId)) {
    return { ok: false, message: "ID del producto inválido o requerido" };
  }
  if (calificacion < 1 || calificacion > 5) {
    return { ok: false, message: "La calificación debe estar entre 1 y 5" };
  }
  if (!descripcion?.trim()) {
    return { ok: false, message: "La descripción de la reseña es requerida" };
  }
  if (multimedia && !Array.isArray(multimedia)) {
    return { ok: false, message: "Multimedia debe ser un array de URLs" };
  }
  if (negocioId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(negocioId)) {
    return { ok: false, message: "ID del negocio inválido" };
  }
  if (publicacionId && !/^c[0-9a-z]{24}$/.test(publicacionId)) {
    return { ok: false, message: "ID de la publicación inválido para edición" };
  }

  // Autenticación
  const session = await auth();
  if (!session || !session.user?.id) {
    return { ok: false, message: "Usuario no autenticado" };
  }
  const usuarioId = session.user.id;

  // Definir modo edición vs creación
  const esEdicion = !!publicacionId;

  try {
    // Verificar existencia del producto y obtener negocioId si no se pasó
    const producto = await prisma.product.findUnique({
      where: { id: productoId },
      select: { id: true, negocioId: true, slug: true, ratingPromedio: true, numResenas: true },
    });
    if (!producto) {
      return { ok: false, message: "Producto no encontrado" };
    }
    const resolvedNegocioId = negocioId || producto.negocioId;
    if (!resolvedNegocioId) {
      return { ok: false, message: "Negocio no asociado al producto" };
    }

    // Ejecutar transacción
    const result = await prisma.$transaction(async (tx) => {
      let publicacion;

      if (esEdicion) {
        publicacion = await tx.publicacion.update({
          where: { id: publicacionId! },
          data: {
            descripcion,
            calificacion,
            visibilidad,
            updatedAt: new Date(),
          },
          select: { id: true },
        });
      } else {
        publicacion = await tx.publicacion.create({
          data: {
            usuarioId,
            negocioId: resolvedNegocioId,
            tipo: PublicacionTipo.TESTIMONIO,
            descripcion,
            calificacion,
            visibilidad,
            numLikes: 0,
            numComentarios: 0,
            numCompartidos: 0,
          },
          select: { id: true },
        });
      }

      const nuevaPublicacionId = publicacion.id;

      if (esEdicion) {
        await tx.media.deleteMany({ where: { publicacionId: nuevaPublicacionId } });
      }
      await tx.media.createMany({
        data: multimedia.map((url, index) => ({
          url,
          tipo: url.endsWith(".mp4") ? "VIDEO" : "IMAGEN",
          orden: index,
          publicacionId: nuevaPublicacionId,
        })),
      });

      await tx.publicacionProducto.upsert({
        where: { publicacionId_productoId: { publicacionId: nuevaPublicacionId, productoId } },
        update: { esResena: true, orden: 0 },
        create: {
          publicacionId: nuevaPublicacionId,
          productoId,
          esResena: true,
          orden: 0,
        },
      });

      const reseñas = await tx.publicacion.findMany({
        where: {
          tipo: PublicacionTipo.TESTIMONIO,
          productosEnPublicacion: {
            some: { productoId, esResena: true },
          },
          calificacion: { not: null },
        },
        select: { calificacion: true },
      });

      const numResenas = reseñas.length;
      const sumaCalificaciones = reseñas.reduce((sum, r) => sum + (r.calificacion || 0), 0);
      const ratingPromedio = numResenas > 0 ? sumaCalificaciones / numResenas : null;

      await tx.product.update({
        where: { id: productoId },
        data: { numResenas, ratingPromedio },
      });

      return { nuevaPublicacionId, numResenas, ratingPromedio };
    });

    revalidatePath(`/producto/${producto.slug}`);
    revalidatePath(`/perfil/${resolvedNegocioId}`);

    return {
      ok: true,
      message: esEdicion ? "Reseña actualizada exitosamente" : "Reseña creada exitosamente",
      publicacionId: result.nuevaPublicacionId,
      ratingPromedio: result.ratingPromedio || 0,
      numResenas: result.numResenas,
    };
  } catch (error) {
    console.error("Error en createResenaProducto:", error);
    return {
      ok: false,
      message: `Error al procesar la reseña: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
};