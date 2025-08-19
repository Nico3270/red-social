

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";


export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const session = await auth();

    if (!session || !session.user.negocioId) {
      return NextResponse.json(
        { ok: false, message: "Debes estar autenticado para eliminar un servicio" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "El ID del servicio es requerido" },
        { status: 400 }
      );
    }

    const servicio = await prisma.servicio.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: `Servicio "${servicio.titulo}" eliminado correctamente`,
    });
  } catch (error) {
    console.error("Error al eliminar el servicio:", error);
    return NextResponse.json(
      { ok: false, message: "Error al eliminar el servicio" },
      { status: 500 }
    );
  }
}
