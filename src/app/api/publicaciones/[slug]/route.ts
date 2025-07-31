// src/types/api.ts
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { PublicacionTipo } from "@prisma/client";

export interface ProductosNegocioBySlug {
  ok: boolean;
  products?: ProductRedSocial[];
  message?: string;
}

export interface PublicacionesResult {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

export interface PublicacionesNegocioProps {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
  userId?: string; // ID del usuario autenticado para verificar reacciones
}
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const url = req.nextUrl;
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");
  const tipo = (url.searchParams.get("tipo") as PublicacionTipo) || undefined;
  const userId = url.searchParams.get("userId") || undefined;

  const props: PublicacionesNegocioProps = { slug, tipo, skip, take, userId };

  // Validate slug
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json<PublicacionesResult>(
      {
        ok: false,
        message: "Slug de negocio inválido o no proporcionado",
        publicaciones: [],
      },
      { status: 400 }
    );
  }

  try {
    // Find the business by slug
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: {
        id: true,
        nombre: true,
        slug: true,
        fotoPerfil: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            username: true,
            fotoPerfil: true,
          },
        },
      },
    });

    if (!negocio) {
      return NextResponse.json<PublicacionesResult>(
        {
          ok: false,
          message: "Negocio no encontrado para el slug proporcionado",
          publicaciones: [],
        },
        { status: 404 }
      );
    }

    // Fetch publications
    const publicaciones = await prisma.publicacion.findMany({
      where: {
        negocioId: negocio.id,
        tipo: tipo,
      },
      include: {
        multimedia: {
          select: {
            id: true,
            url: true,
            tipo: true,
            formato: true,
            orden: true,
          },
        },
        interacciones: {
          where: { tipo: "COMENTARIO" },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                username: true,
                fotoPerfil: true,
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            username: true,
            fotoPerfil: true,
          },
        },
      },
      skip,
      take,
    });

    // Fetch user reactions if userId is provided
    const userReactions = userId
      ? await prisma.interaccion.findMany({
          where: {
            usuarioId: userId,
            publicacionId: { in: publicaciones.map((pub) => pub.id) },
          },
          select: {
            publicacionId: true,
            tipo: true,
            id: true,
          },
        })
      : [];

    // Transform the data
    const formattedPublicaciones: EnhancedPublicacion[] = publicaciones.map((pub) => {
      const userReaction = userReactions.find((reaction) => reaction.publicacionId === pub.id) || null;

      return {
        id: pub.id,
        usuario: {
          id: pub.usuario.id,
          nombre: pub.usuario.nombre,
          apellido: pub.usuario.apellido ?? "",
          username: pub.usuario.username ?? "",
          fotoPerfil: pub.usuario.fotoPerfil ?? undefined,
        },
        negocio: {
          id: negocio.id,
          nombre: negocio.nombre,
          slug: negocio.slug,
          fotoPerfil: negocio.fotoPerfil ?? undefined,
        },
        tipo: pub.tipo,
        titulo: pub.titulo ?? undefined,
        descripcion: pub.descripcion ?? undefined,
        multimedia: pub.multimedia.map((media) => ({
          id: media.id,
          url: media.url,
          tipo: media.tipo,
          formato: media.formato ?? undefined,
          orden: media.orden,
        })),
        visibilidad: pub.visibilidad ?? "PUBLICA",
        createdAt: pub.createdAt.toISOString(),
        numLikes: pub.numLikes,
        numComentarios: pub.numComentarios,
        numCompartidos: pub.numCompartidos,
        userReaction: userReaction
          ? {
              id: userReaction.id,
              tipo: userReaction.tipo as "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY",
            }
          : null,
        comments: pub.interacciones.map((interaccion) => ({
          id: interaccion.id,
          contenido: interaccion.contenido ?? "",
          createdAt: interaccion.createdAt.toISOString(),
          usuario: {
            id: interaccion.usuario.id,
            nombre: interaccion.usuario.nombre,
            apellido: interaccion.usuario.apellido ?? "",
            username: interaccion.usuario.username ?? "",
            fotoPerfil: interaccion.usuario.fotoPerfil ?? undefined,
          },
        })),
      };
    });

    return NextResponse.json<PublicacionesResult>(
      {
        ok: true,
        message: "Publicaciones obtenidas exitosamente",
        publicaciones: formattedPublicaciones,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate" } }
    );
  } catch (error) {
    console.error("Error fetching publicaciones:", error);
    let message = "Error al obtener las publicaciones";
    if (error instanceof Error) {
      message = `Error al obtener las publicaciones: ${error.message}`;
    }
    return NextResponse.json<PublicacionesResult>(
      { ok: false, message, publicaciones: [] },
      { status: 500 }
    );
  }
}