import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // Validar ID (CUID para Publicacion)
  if (!id || !/^c[0-9a-z]{24}$/.test(id)) {
    return NextResponse.json({ ok: false, message: "ID de reseña inválido" }, { status: 400 });
  }

  try {
    const publicacion = await prisma.publicacion.findUnique({
      where: { id },
      select: {
        id: true,
        descripcion: true,
        calificacion: true,
        visibilidad: true,
        multimedia: {
          select: { url: true, tipo: true, orden: true },
          orderBy: { orden: "asc" },
        },
        negocio: {
          select: { id: true, nombre: true, slug: true, fotoPerfil: true },
        },
        productosEnPublicacion: {
          where: { esResena: true },
          select: {
            producto: {
              select: { id: true, nombre: true, slug: true, imagenes: true },
            },
          },
          take: 1, // Asumir un solo producto por reseña
        },
      },
    });

    if (!publicacion) {
      return NextResponse.json({ ok: false, message: "Reseña no encontrada" }, { status: 404 });
    }

    // Formatear respuesta
    const resena = {
      id: publicacion.id,
      descripcion: publicacion.descripcion,
      calificacion: publicacion.calificacion,
      visibilidad: publicacion.visibilidad,
      multimedia: publicacion.multimedia,
      producto: publicacion.productosEnPublicacion[0]?.producto
        ? {
            id: publicacion.productosEnPublicacion[0].producto.id,
            nombre: publicacion.productosEnPublicacion[0].producto.nombre,
            slug: publicacion.productosEnPublicacion[0].producto.slug,
            imagen: publicacion.productosEnPublicacion[0].producto.imagenes[0] || "",
          }
        : undefined,
      negocio: publicacion.negocio
        ? {
            id: publicacion.negocio.id,
            nombre: publicacion.negocio.nombre,
            slug: publicacion.negocio.slug,
            fotoPerfil: publicacion.negocio.fotoPerfil || "",
          }
        : undefined,
    };

    return NextResponse.json({ ok: true, resena }, { status: 200 });
  } catch (error) {
    console.error("Error al cargar la reseña:", error);
    return NextResponse.json(
      { ok: false, message: "Error al cargar la reseña" },
      { status: 500 }
    );
  }
}