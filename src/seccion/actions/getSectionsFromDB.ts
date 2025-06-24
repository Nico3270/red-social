"use server";

import prisma from "@/lib/prisma";

// Interfaz para el formato de la sección en el frontend
export interface Section {
  id: string;
  name: string;
  iconName: string; // Solo el nombre del ícono
  href: string;
  order: number; // ✅ Agregamos la propiedad
}

// Interfaz para las secciones de Prisma
export interface PrismaSection {
  id: string;
  nombre: string;
  slug: string;
  iconName: string | null; // Permitir null aquí
  order: number;
  isActive: boolean;
}

export const getSectionsFromDB = async (): Promise<Section[]> => {
  try {
    // Consulta a la base de datos para obtener secciones activas y ordenadas
    const sections = await prisma.section.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Transformar las secciones al formato esperado (Section[])
    return sections.map((section) => ({
      id: section.id,
      name: section.nombre,
      href: section.slug,
      iconName: section.iconName ?? "default-icon", // Asignar un valor por defecto si es null
      order: section.order ?? 55, // ✅ Si "order" es null, asignar un valor alto temporalmente
    }));
  } catch (error) {
    console.error("Error al obtener secciones:", error);
    return [];
  }
};
