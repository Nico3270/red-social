// src/app/api/getServiciosNegocio/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MultimediaTipo } from "@prisma/client";
import { auth } from "@/auth.config";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.negocioId) {
      return NextResponse.json(
        { ok: false, message: "Debes estar autenticado para obtener los servicios" },
        { status: 401 }
      );
    }

    const servicios = await prisma.servicio.findMany({
      where: { negocioId: session.user.negocioId },
      orderBy: { createdAt: "desc" },
      include: { multimedia: { orderBy: { orden: "asc" } } },
    });

    return NextResponse.json({
      ok: true,
      message: "Servicios obtenidos correctamente",
      servicios: servicios.map((servicio) => ({
        id: servicio.id,
        titulo: servicio.titulo,
        descripcion: servicio.descripcion,
        slug: servicio.slug,
        precio: servicio.precio ?? undefined,
        currency: servicio.currency,
        status: servicio.status,
        tags: servicio.tags,
        multimedia: servicio.multimedia.map((media) => ({
          url: media.url,
          orden: media.orden,
          tipo: media.tipo === MultimediaTipo.VIDEO ? "VIDEO" : "IMAGEN",
        })),
        negocioId: servicio.negocioId,
      })),
    });
  } catch (error) {
    console.error("Error al obtener los servicios:", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener los servicios" },
      { status: 500 }
    );
  }
}
