"use server";

import prisma from "@/lib/prisma";

export const updateBlogsOrder = async (blogs: { id: string; orden: number }[]) => {
  try {
    for (const { id, orden } of blogs) {
      await prisma.articulo.update({
        where: { id },
        data: { orden },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el orden de los blogs:", error);
    return { success: false };
  }
};
