"use server";

import prisma from "@/lib/prisma";

export const updateSectionsOrder = async (sections: { id: string; order: number }[]) => {
  try {
    for (const { id, order } of sections) {
      await prisma.section.update({
        where: { id },
        data: { order },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el orden de las secciones:", error);
    return { success: false };
  }
};
