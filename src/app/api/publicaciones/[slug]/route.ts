import { NextRequest, NextResponse } from "next/server";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { PublicacionTipo, InteraccionTipo } from "@prisma/client";
import prisma from "@/lib/prisma";

// Tipos existentes
interface UserReaction {
  publicacionId: string;
  tipo: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY";
  id: string;
}

interface PublicacionesNegocioProps {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
  userId?: string;
}

interface PublicacionesResult {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const params = await context.params;
  const { slug } = params;

  const url = req.nextUrl;
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");
  const tipo = (url.searchParams.get("tipo") as PublicacionTipo) || undefined;
  const userId = url.searchParams.get("userId") || undefined;

  const props: PublicacionesNegocioProps = { slug, tipo, skip, take, userId };
  console.log("API: Request params:", props);

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

    const publicaciones = await prisma.publicacion.findMany({
      where: {
        negocioId: negocio.id,
        tipo: tipo,
        visibilidad: "PUBLICA", // Añadido para consistencia
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
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    console.log("API: Fetched publicaciones:", publicaciones.length);
    console.log(
      "API: Publicaciones details:",
      publicaciones.map((pub) => ({
        id: pub.id,
        tipo: pub.tipo,
        createdAt: pub.createdAt.toISOString(),
      }))
    );

    let userReactions: UserReaction[] = [];
    if (userId) {
      const rawReactions = await prisma.interaccion.findMany({
        where: {
          usuarioId: userId,
          publicacionId: { in: publicaciones.map((pub) => pub.id) },
          tipo: { in: ["LIKE", "LOVE", "WOW", "SAD", "ANGRY"] as unknown as InteraccionTipo[] },
        },
        select: {
          publicacionId: true,
          tipo: true,
          id: true,
        },
      });
      userReactions = rawReactions.map((reaction): UserReaction => {
        const { publicacionId, tipo, id } = reaction;
        if (!["LIKE", "LOVE", "WOW", "SAD", "ANGRY"].includes(tipo)) {
          throw new Error(`Tipo de reacción inválido: ${tipo}`);
        }
        return { publicacionId, tipo: tipo as "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY", id };
      });
    }

    const formattedPublicaciones: EnhancedPublicacion[] = publicaciones.map((pub) => {
      const userReaction = userId
        ? userReactions.find((reaction) => reaction.publicacionId === pub.id) || null
        : null;

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
              tipo: userReaction.tipo,
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

    console.log("API: Returning publicaciones:", formattedPublicaciones.length);
    return NextResponse.json<PublicacionesResult>(
      {
        ok: true,
        message: "Publicaciones obtenidas exitosamente",
        publicaciones: formattedPublicaciones,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate" } }
    );
  } catch (error) {
    console.error("API: Error fetching publicaciones:", error);
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