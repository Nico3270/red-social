"use server";

import prisma from "@/lib/prisma";
import { Genero } from "@prisma/client"; // Importa el enum para tipado estricto

export const updatePerfilInformation = async (
  userId: string,
  ciudad: string,
  departamento: string,
  genero: Genero, // Tipado como enum: fuerza valores válidos ('masculino' | 'femenino' | 'otro')
  fechaNacimiento: Date
) => {
  try {
    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: {
        ciudad,
        departamento,
        genero, // Ahora pasa directamente, ya que es tipado como Genero
        fechaNacimiento,
        perfilCompleto: true, // Actualiza la bandera en DB
      },
    });

    if (!updatedUser) {
      return { ok: false, message: "No se pudo actualizar el perfil. Intenta de nuevo." };
    }

    return { ok: true, message: "Perfil actualizado exitosamente." };
  } catch (error) {
    console.error("Error en updatePerfilInformation:", error);
    return { ok: false, message: "Error inesperado. Por favor, contacta soporte." };
  }
};