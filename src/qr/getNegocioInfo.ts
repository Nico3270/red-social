// /actions/getNegocioInfo.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";

export async function getNegocioInfo() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const negocio = await prisma.negocio.findFirst({
    where: { usuarioId: session.user.id }, // Asumiendo relación usuario-negocio
    select: {
      nombre: true,
      slug: true,
      fotoPerfil: true,
    },
  });

  if (!negocio) {
    throw new Error("Negocio no encontrado");
  }

  return negocio;
}