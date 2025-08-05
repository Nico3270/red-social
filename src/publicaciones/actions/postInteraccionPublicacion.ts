"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { ReaccionTipo } from "@prisma/client";
import { revalidatePath } from "next/cache"; // Importar revalidatePath

interface PostInteraccionProps {
  publicacionId: string;
  slug?: string; // Hacer slug opcional
  tipo: "REACCION" | "COMENTARIO" | "COMPARTIDO";
  reaccionTipo?: ReaccionTipo | null;
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
}

export const postInteraccionPublicacion = async ({
  publicacionId,
  slug,
  tipo,
  reaccionTipo,
  contenido,
}: PostInteraccionProps): Promise<PostInteraccionResult> => {
  // Validate inputs
  if (!publicacionId || !/^c[0-9a-z]{24}$/.test(publicacionId)) {
    return { ok: false, message: "ID de publicación inválido o no tiene formato CUID" };
  }
  if (slug && !/^[a-z0-9-]+$/i.test(slug)) {
    return { ok: false, message: "Slug de negocio inválido" };
  }
  if (!["REACCION", "COMENTARIO", "COMPARTIDO"].includes(tipo)) {
    return { ok: false, message: "Tipo de interacción inválido" };
  }
  if (tipo === "REACCION" && reaccionTipo && !["LIKE", "LOVE", "WOW", "SAD", "ANGRY"].includes(reaccionTipo)) {
    return { ok: false, message: "Tipo de reacción inválido" };
  }
  if (tipo === "COMENTARIO" && (!contenido || !contenido.trim())) {
    return { ok: false, message: "El contenido del comentario es requerido" };
  }

  // Get authenticated user
  const session = await auth();
  if (!session || !session.user?.id) {
    return { ok: false, message: "Usuario no autenticado" };
  }
  const usuarioId = session.user.id;

  try {
    // Verify publication and business
    const publicacion = await prisma.publicacion.findUnique({
      where: { id: publicacionId },
      select: {
        id: true,
        numLikes: true,
        numComentarios: true,
        numCompartidos: true,
        negocio: {
          select: { slug: true },
        },
      },
    });
    if (!publicacion) {
      return { ok: false, message: "Publicación no encontrada" };
    }
    if (slug && publicacion.negocio?.slug !== slug) {
      return { ok: false, message: "La publicación no pertenece al negocio especificado" };
    }

    if (tipo === "REACCION") {
      if (reaccionTipo) {
        // Check for existing reaction
        const existingReaction = await prisma.interaccion.findFirst({
          where: {
            publicacionId,
            usuarioId,
            tipo: "REACCION",
          },
          select: { id: true, reaccionTipo: true },
        });

        if (existingReaction) {
          if (existingReaction.reaccionTipo === reaccionTipo) {
            return { ok: false, message: `El usuario ya dio ${reaccionTipo} a esta publicación` };
          }
          // Update existing reaction
          const [interaccion] = await prisma.$transaction([
            prisma.interaccion.update({
              where: { id: existingReaction.id },
              data: { reaccionTipo },
              select: { id: true, createdAt: true, reaccionTipo: true },
            }),
            prisma.publicacion.update({
              where: { id: publicacionId },
              data: { numLikes: publicacion.numLikes }, // No change in numLikes since reaction is updated
            }),
          ]);

          return {
            ok: true,
            message: "Reacción actualizada exitosamente",
            id: interaccion.id,
            createdAt: interaccion.createdAt,
            reaccionTipo: interaccion.reaccionTipo,
          };
        }

        // Create new reaction
        const [interaccion] = await prisma.$transaction([
          prisma.interaccion.create({
            data: {
              publicacionId,
              usuarioId,
              tipo: "REACCION",
              reaccionTipo,
            },
            select: { id: true, createdAt: true, reaccionTipo: true },
          }),
          prisma.publicacion.update({
            where: { id: publicacionId },
            data: { numLikes: { increment: 1 } },
          }),
        ]);

        return {
          ok: true,
          message: "Reacción registrada exitosamente",
          id: interaccion.id,
          createdAt: interaccion.createdAt,
          reaccionTipo: interaccion.reaccionTipo,
        };
      } else {
        // Remove reaction
        const existingReaction = await prisma.interaccion.findFirst({
          where: {
            publicacionId,
            usuarioId,
            tipo: "REACCION",
          },
          select: { id: true, reaccionTipo: true },
        });

        if (!existingReaction) {
          return { ok: false, message: "No se encontró una reacción para eliminar" };
        }

        await prisma.$transaction([
          prisma.interaccion.delete({
            where: { id: existingReaction.id },
          }),
          prisma.publicacion.update({
            where: { id: publicacionId },
            data: { numLikes: { decrement: 1 } },
          }),
        ]);

        return {
          ok: true,
          message: "Reacción eliminada exitosamente",
          reaccionTipo: null,
        };
      }
    } else if (tipo === "COMENTARIO") {
      const [interaccion] = await prisma.$transaction([
        prisma.interaccion.create({
          data: {
            publicacionId,
            usuarioId,
            tipo: "COMENTARIO",
            contenido,
          },
          select: {
            id: true,
            createdAt: true,
            usuario: {
              select: {
                nombre: true,
                apellido: true,
                username: true,
                fotoPerfil: true,
              },
            },
          },
        }),
        prisma.publicacion.update({
          where: { id: publicacionId },
          data: { numComentarios: { increment: 1 } },
        }),
      ]);

      // Invalidar el caché de la página del perfil del negocio
      if (publicacion.negocio?.slug) {
        revalidatePath(`/perfil/${publicacion.negocio.slug}`);
      }

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
          data: {
            publicacionId,
            usuarioId,
            tipo: "COMPARTIDO",
          },
          select: {
            id: true,
            createdAt: true,
          },
        }),
        prisma.publicacion.update({
          where: { id: publicacionId },
          data: { numCompartidos: { increment: 1 } },
        }),
      ]);

      return {
        ok: true,
        message: "Publicación compartida exitosamente",
        id: interaccion.id,
        createdAt: interaccion.createdAt,
      };
    }

    return { ok: false, message: "Tipo de interacción no manejado" };
  } catch (error) {
    console.error("Error creating interaction:", error);
    return {
      ok: false,
      message: `Error al procesar la interacción: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
};