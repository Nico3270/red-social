"use server";

import prisma from "@/lib/prisma";

export const getSectionsList = async () => {
  try {
    const sections = await prisma.section.findMany({
      orderBy: { order: "asc" },
    });
    return sections;
  } catch (error) {
    console.error("Error al obtener secciones:", error);
    return [];
  }
};
