"use server";

import prisma from "@/lib/prisma";

export const getAvailableSections = async () => {
  try {
    const sections = await prisma.section.findMany({
      select: {
        id: true,
        nombre: true,
      },
    });
    return sections;
  } catch (error) {
    console.error("Error al obtener las secciones disponibles:", error);
    return [];
  }
};
