"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { PublicacionTipo } from "@prisma/client";


// Tipo de la publicación creada para el retorno
interface PublicacionCreada {
  id: string;
  usuarioId: string;
  negocioId?: string;
  productoId?: string;
  tipo: string;
  descripcion?: string;
  multimedia?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Tipo de entrada adaptado para la server action
interface InformacionPublicacion {
  usuarioId?: string;
  negocioId?: string;
  publicacionId?: string;
  productoId?: string;
  tipo: PublicacionTipo;
  contexto: "producto" | "negocio" | "usuario";
  descripcion?: string;
  multimedia?: string[];
}

// Respuesta de la server action
interface Response {
  ok: boolean;
  message: string;
  publicacion?: PublicacionCreada;
}



export async function createUpdateTestimonio(data: InformacionPublicacion): Promise<Response> {
  const session = await auth();
  if (!session || !session.user.id) {
    return { ok: false, message: "No estás autenticado. Por favor, inicia sesión." };
  }

  const usuarioId = session.user.id;
  const role = session.user.role as string; // Asumimos que role está en la sesión
  let negocioIdFromUser: string | undefined;

  // Verificar si el usuario tiene un negocio asociado (si role es "negocio")
  if (role === "negocio") {
    const negocio = await prisma.negocio.findFirst({
      where: { usuarioId },
    });
    negocioIdFromUser = negocio?.id;
    if (data.negocioId && negocioIdFromUser && data.negocioId !== negocioIdFromUser) {
      return { ok: false, message: "El negocioId no coincide con el usuario autenticado." };
    }
  }

  try {
    let publicacion;

    if (data.publicacionId) {
      // Editar publicación existente
      publicacion = await prisma.publicacion.update({
        where: { id: data.publicacionId },
        data: {
          descripcion: data.descripcion,
          multimedia: {
            deleteMany: {}, // Eliminar multimedia existente
            create: data.multimedia?.map((url) => ({
              url,
              tipo: url.endsWith(".mp4") ? "VIDEO" : "IMAGEN", // Simplificación; ajusta según tu lógica
              orden: 0,
            })),
          },
          updatedAt: new Date(),
        },
        include: {
          multimedia: true,
          productosEnPublicacion: { include: { producto: true } },
        },
      });
    } else {
      // Crear nueva publicación
      switch (data.contexto) {
        case "negocio":
          if (!data.negocioId && !negocioIdFromUser) {
            return { ok: false, message: "Falta el negocioId para este contexto." };
          }
          const negocioId = data.negocioId || negocioIdFromUser;
          publicacion = await prisma.publicacion.create({
            data: {
              usuarioId,
              negocioId,
              tipo: data.tipo,
              descripcion: data.descripcion,
              multimedia: {
                create: data.multimedia?.map((url) => ({
                  url,
                  tipo: url.endsWith(".mp4") ? "VIDEO" : "IMAGEN",
                  orden: 0,
                })),
              },
              productosEnPublicacion: data.productoId
                ? {
                    create: {
                      productoId: data.productoId,
                      orden: 0,
                    },
                  }
                : undefined,
            },
            include: {
              multimedia: true,
              productosEnPublicacion: { include: { producto: true } },
            },
          });
          break;

        case "producto":
          if (!data.productoId) {
            return { ok: false, message: "Falta el productoId para este contexto." };
          }
          const productoExists = await prisma.product.findUnique({
            where: { id: data.productoId },
          });
          if (!productoExists) {
            return { ok: false, message: "El producto especificado no existe." };
          }
          publicacion = await prisma.publicacion.create({
            data: {
              usuarioId,
              tipo: data.tipo,
              descripcion: data.descripcion,
              multimedia: {
                create: data.multimedia?.map((url) => ({
                  url,
                  tipo: url.endsWith(".mp4") ? "VIDEO" : "IMAGEN",
                  orden: 0,
                })),
              },
              productosEnPublicacion: {
                create: {
                  productoId: data.productoId,
                  orden: 0,
                },
              },
            },
            include: {
              multimedia: true,
              productosEnPublicacion: { include: { producto: true } },
            },
          });
          break;

        case "usuario":
          if (role === "negocio" && negocioIdFromUser) {
            publicacion = await prisma.publicacion.create({
              data: {
                usuarioId,
                negocioId: negocioIdFromUser,
                tipo: data.tipo,
                descripcion: data.descripcion,
                multimedia: {
                  create: data.multimedia?.map((url) => ({
                    url,
                    tipo: url.endsWith(".mp4") ? "VIDEO" : "IMAGEN",
                    orden: 0,
                  })),
                },
              },
              include: {
                multimedia: true,
                productosEnPublicacion: { include: { producto: true } },
              },
            });
          } else {
            publicacion = await prisma.publicacion.create({
              data: {
                usuarioId,
                tipo: data.tipo,
                descripcion: data.descripcion,
                multimedia: {
                  create: data.multimedia?.map((url) => ({
                    url,
                    tipo: url.endsWith(".mp4") ? "VIDEO" : "IMAGEN",
                    orden: 0,
                  })),
                },
              },
              include: {
                multimedia: true,
                productosEnPublicacion: { include: { producto: true } },
              },
            });
          }
          break;

        default:
          return { ok: false, message: "Contexto no válido." };
      }
    }

    // Mapear la publicación al tipo de retorno
    const publicacionCreada: PublicacionCreada = {
      id: publicacion.id,
      usuarioId: publicacion.usuarioId,
      negocioId: publicacion.negocioId || "",
      productoId: publicacion.productosEnPublicacion?.[0]?.productoId,
      tipo: publicacion.tipo,
      descripcion: publicacion.descripcion || "",
      multimedia: publicacion.multimedia.map((m) => m.url),
      createdAt: publicacion.createdAt,
      updatedAt: publicacion.updatedAt,
    };

    return {
      ok: true,
      message: data.publicacionId ? "Publicación actualizada con éxito." : "Publicación creada con éxito.",
      publicacion: publicacionCreada,
    };
  } catch (error) {
    console.error("Error en createUpdateTestimonio:", error);
    return {
      ok: false,
      message: `Error al ${data.publicacionId ? "actualizar" : "crear"} la publicación: ${error}`,
    };
  }
}