// src/actions/fetchSections.ts
import prisma from "@/lib/prisma";

export const fetchSectionsNewBlog = async () => {
  try {
    const secciones = await prisma.section.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return secciones;
  } catch (error) {
    console.error("Error fetching sections:", error);
    throw new Error("No se pudieron obtener las secciones.");
  }
};
