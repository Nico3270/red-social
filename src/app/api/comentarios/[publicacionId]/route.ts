import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Comment {
  id: string;
  contenido: string;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    username: string;
    fotoPerfil?: string;
  };
}

interface ComentariosResult {
  ok: boolean;
  message: string;
  comentarios: Comment[];
  total: number;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ publicacionId: string }> }
) {
  const params = await context.params;
  const { publicacionId } = params;

  const url = req.nextUrl;
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  console.log(
    "API: Request params - publicacionId:",
    publicacionId,
    "skip:",
    skip,
    "take:",
    take
  );

  if (!publicacionId || !/^[a-z0-9-]+$/.test(publicacionId)) {
    return NextResponse.json<ComentariosResult>(
      {
        ok: false,
        message: "ID de publicación inválido o no proporcionado",
        comentarios: [],
        total: 0,
      },
      { status: 400 }
    );
  }

  try {
    const publicacion = await prisma.publicacion.findUnique({
      where: { id: publicacionId },
      select: { id: true },
    });

    if (!publicacion) {
      return NextResponse.json<ComentariosResult>(
        {
          ok: false,
          message: "Publicación no encontrada",
          comentarios: [],
          total: 0,
        },
        { status: 404 }
      );
    }

    const comentarios = await prisma.interaccion.findMany({
      where: { publicacionId, tipo: "COMENTARIO" },
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
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const total = await prisma.interaccion.count({
      where: { publicacionId, tipo: "COMENTARIO" },
    });

    const formattedComentarios: Comment[] = comentarios.map((interaccion) => ({
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
    }));

    console.log("API: Fetched comentarios:", formattedComentarios.length, "total:", total);
    return NextResponse.json<ComentariosResult>(
      {
        ok: true,
        message: "Comentarios obtenidos exitosamente",
        comentarios: formattedComentarios,
        total,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": total > 0 ? "s-maxage=300, stale-while-revalidate" : "no-store", // No cachear si no hay comentarios
        },
      }
    );
  } catch (error) {
    console.error("API: Error fetching comentarios:", error);
    let message = "Error al obtener los comentarios";
    if (error instanceof Error) {
      message = `Error al obtener los comentarios: ${error.message}`;
    }
    return NextResponse.json<ComentariosResult>(
      { ok: false, message, comentarios: [], total: 0 },
      { status: 500 }
    );
  }
}