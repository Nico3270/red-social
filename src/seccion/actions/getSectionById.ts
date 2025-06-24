"use server";

import prisma from "@/lib/prisma";

export const getSectionById = async (id: string) => {
  try {
    const section = await prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      throw new Error(`No se encontró ninguna sección con el id ${id}`);
    }

    return section;
  } catch (error) {
    console.error("Error al obtener la sección:", error);
    throw error;
  }
};
