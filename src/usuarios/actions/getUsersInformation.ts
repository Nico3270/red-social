"use server"

// app/actions/getUsersInformation.ts
import prisma from "@/lib/prisma";

export async function getUsersInformation() {
  return await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      fotoPerfil: true
    },
  });
}
