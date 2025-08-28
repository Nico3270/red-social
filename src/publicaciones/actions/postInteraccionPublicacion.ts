"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { ReaccionTipo } from "@prisma/client";
import { revalidateTag } from "next/cache";  // Cambia de revalidatePath a esto

interface PostInteraccionProps {
  publicacionId: string;
  slug?: string;
  tipo: "REACCION" | "COMENTARIO" | "COMPARTIDO";
  reaccionTipo?: ReaccionTipo | null; // Solo LIKE o null
  contenido?: string;
}

interface PostInteraccionResult {
  ok: boolean;
  message: string;
  id?: string;
  createdAt?: Date;
  reaccionTipo?: ReaccionTipo | null;
  usuarioNombre?: string;
  usuarioApellido?: string;
  usuarioUsername?: string;
  usuarioFotoPerfil?: string;
  newNumLikes?: number; // Agregado: Conteo actualizado de likes para optimismo en cliente
  newUserReaction?: ReaccionTipo | null; // Agregado: Reacción del usuario actualizada para consistencia
}

export const postInteraccionPublicacion = async ({
  publicacionId,
  slug,
  tipo,
  reaccionTipo,
  contenido,
}: PostInteraccionProps): Promise<PostInteraccionResult> => {
  if (!publicacionId || !/^c[0-9a-z]{24}$/.test(publicacionId)) {
    return { ok: false, message: "ID de publicación inválido o no tiene formato CUID" };
  }
  if (slug && !/^[a-z0-9-]+$/i.test(slug)) {
    return { ok: false, message: "Slug de negocio inválido" };
  }
  if (!["REACCION", "COMENTARIO", "COMPARTIDO"].includes(tipo)) {
    return { ok: false, message: "Tipo de interacción inválido" };
  }
  if (tipo === "REACCION" && reaccionTipo && reaccionTipo !== "LIKE") {
    return { ok: false, message: "Solo se permite reacción LIKE" };
  }
  if (tipo === "COMENTARIO" && (!contenido || !contenido.trim())) {
    return { ok: false, message: "El contenido del comentario es requerido" };
  }

  const session = await auth();
  if (!session || !session.user?.id) {
    return { ok: false, message: "Usuario no autenticado" };
  }
  const usuarioId = session.user.id;

  try {
    const publicacion = await prisma.publicacion.findUnique({
      where: { id: publicacionId },
      select: {
        id: true,
        numLikes: true,
        numComentarios: true,
        numCompartidos: true,
        negocio: { select: { slug: true } },
      },
    });
    if (!publicacion) {
      return { ok: false, message: "Publicación no encontrada" };
    }
    if (slug && publicacion.negocio?.slug !== slug) {
      return { ok: false, message: "La publicación no pertenece al negocio especificado" };
    }


    const revalidatePublications = (negocioSlug?: string | null) => {
  if (negocioSlug) {
    console.log(`Revalidating tag for publications: negocio-publications-${negocioSlug}`);
    revalidateTag(`negocio-publications-${negocioSlug}`);  // Ahora per-slug
  }
};

    if (tipo === "REACCION") {
      const existingReaction = await prisma.interaccion.findFirst({
        where: { publicacionId, usuarioId, tipo: "REACCION" },
        select: { id: true, reaccionTipo: true },
      });

      if (reaccionTipo === "LIKE") {
        if (existingReaction) {
          return { ok: false, message: "Ya diste like a esta publicación" };
        }
        const [interaccion, updatedPublicacion] = await prisma.$transaction([
          prisma.interaccion.create({
            data: { publicacionId, usuarioId, tipo: "REACCION", reaccionTipo: "LIKE" },
            select: { id: true, createdAt: true, reaccionTipo: true },
          }),
          prisma.publicacion.update({
            where: { id: publicacionId },
            data: { numLikes: { increment: 1 } },
            select: { numLikes: true },
          }),
        ]);
        revalidatePublications(publicacion.negocio?.slug);  // Reemplaza revalidateIfSlug()
        return {
          ok: true,
          message: "Like registrado exitosamente",
          id: interaccion.id,
          createdAt: interaccion.createdAt,
          reaccionTipo: interaccion.reaccionTipo,
          newNumLikes: updatedPublicacion.numLikes,
          newUserReaction: "LIKE",
        };
      } else {
        // Remove like
        if (!existingReaction) {
          return { ok: false, message: "No hay like para eliminar" };
        }
        const [, updatedPublicacion] = await prisma.$transaction([
          prisma.interaccion.delete({ where: { id: existingReaction.id } }),
          prisma.publicacion.update({
            where: { id: publicacionId },
            data: { numLikes: { decrement: 1 } },
            select: { numLikes: true },
          }),
        ]);
        revalidatePublications(publicacion.negocio?.slug);  // Reemplaza revalidateIfSlug()
        return {
          ok: true,
          message: "Like eliminado exitosamente",
          reaccionTipo: null,
          newNumLikes: updatedPublicacion.numLikes,
          newUserReaction: null,
        };
      }
    } else if (tipo === "COMENTARIO") {
      const [interaccion] = await prisma.$transaction([
        prisma.interaccion.create({
          data: { publicacionId, usuarioId, tipo: "COMENTARIO", contenido },
          select: {
            id: true,
            createdAt: true,
            usuario: { select: { nombre: true, apellido: true, username: true, fotoPerfil: true } },
          },
        }),
        prisma.publicacion.update({
          where: { id: publicacionId },
          data: { numComentarios: { increment: 1 } },
        }),
      ]);
      revalidatePublications(publicacion.negocio?.slug);  // Reemplaza revalidateIfSlug()
      return {
        ok: true,
        message: "Comentario registrado exitosamente",
        id: interaccion.id,
        createdAt: interaccion.createdAt,
        usuarioNombre: interaccion.usuario.nombre,
        usuarioApellido: interaccion.usuario.apellido || "",
        usuarioUsername: interaccion.usuario.username || `${interaccion.usuario.nombre.toLowerCase()}${interaccion.usuario.apellido?.toLowerCase() || ""}`,
        usuarioFotoPerfil: interaccion.usuario.fotoPerfil ?? undefined,
      };
    } else if (tipo === "COMPARTIDO") {
      const [interaccion] = await prisma.$transaction([
        prisma.interaccion.create({
          data: { publicacionId, usuarioId, tipo: "COMPARTIDO" },
          select: { id: true, createdAt: true },
        }),
        prisma.publicacion.update({
          where: { id: publicacionId },
          data: { numCompartidos: { increment: 1 } },
        }),
      ]);
      revalidatePublications(publicacion.negocio?.slug);  // Reemplaza revalidateIfSlug()
      return {
        ok: true,
        message: "Publicación compartida exitosamente",
        id: interaccion.id,
        createdAt: interaccion.createdAt,
      };
    }

    return { ok: false, message: "Tipo de interacción no manejado" };
  } catch (error) {
    console.error("Error en interacción:", error);
    return { ok: false, message: `Error: ${error instanceof Error ? error.message : "Desconocido"}` };
  }
};