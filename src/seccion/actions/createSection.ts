"use server";

import prisma from "@/lib/prisma";

interface CreateSectionInput {
  nombre: string;
  slug: string;
  iconName: string;
  order: number;
  isActive: boolean;
}

export const createSection = async (data: CreateSectionInput) => {
  try {
    const newSection = await prisma.section.create({
      data: {
        nombre: data.nombre,
        slug: data.slug,
        iconName: data.iconName,
        order: data.order,
        isActive: data.isActive,
      },
    });
    return { success: true, section: newSection };
  } catch (error) {
    console.error("Error al crear sección:", error);
    return { success: false, error: error };
  }
};
