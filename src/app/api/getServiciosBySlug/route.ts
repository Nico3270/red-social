// src/app/api/getBySlug/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MultimediaTipo } from "@prisma/client";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "El slug del negocio es requerido" },
        { status: 400 }
      );
    }


    const negocioId = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, nombre:true, telefonoContacto:true, fotoPerfil:true },
    });

    if (!negocioId) {
  return NextResponse.json(
    { ok: false, message: "Negocio no encontrado" },
    { status: 404 }
  );
}


    const idNegocio= negocioId?.id;
    console.log(idNegocio);

    const servicios = await prisma.servicio.findMany({
      where: { negocioId: negocioId?.id },
      orderBy: { createdAt: "desc" },
      include: { multimedia: { orderBy: { orden: "asc" } } },
    });
    console.log({servicios});

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
        negocioSlug: slug,
        nombreNegocio: negocioId.nombre || "Ver negocio",
        telefonoNegocio: negocioId.telefonoContacto || "",
        negocioFotoPerfil: negocioId.fotoPerfil || "/imgs/admin-avatar.webp"
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
