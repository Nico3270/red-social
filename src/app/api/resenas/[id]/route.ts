// src/app/api/resenas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { id} = params;

  // Validar ID
  if (!id || !/^c[0-9a-z]{24}$/.test(id)) {
    return NextResponse.json({ ok: false, message: "ID inválido" }, { status: 400 });
  }

  try {
    const publicacion = await prisma.publicacion.findUnique({
      where: { id },
      select: {
        id: true,
        descripcion: true,
        multimedia: { select: { url: true }, orderBy: { orden: "asc" } },
        calificacion: true,
        visibilidad: true,
      },
    });

    if (!publicacion) {
      return NextResponse.json({ ok: false, message: "Reseña no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, resena: publicacion }, { status: 200 });
  } catch (error) {
    console.error("Error al cargar la reseña:", error);
    return NextResponse.json(
      { ok: false, message: "Error al cargar la reseña" },
      { status: 500 }
    );
  }
}