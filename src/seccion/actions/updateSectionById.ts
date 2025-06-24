"use server";

import prisma from "@/lib/prisma";

interface UpdateSectionInput {
  id: string;
  nombre: string;
  slug: string;
  iconName: string;
  isActive: boolean;
}

export const updateSection = async (data: UpdateSectionInput) => {
  try {
    const updatedSection = await prisma.section.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        slug: data.slug,
        iconName: data.iconName,
        isActive: data.isActive,
      },
    });

    return { success: true, section: updatedSection };
  } catch (error) {
    console.error("Error al actualizar la sección:", error);
    return { success: false, error: error };
  }
};
