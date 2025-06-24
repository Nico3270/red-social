"use server";

import prisma from "@/lib/prisma";

export const deleteBlog = async (id: string) => {
  try {
    await prisma.articulo.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar el blog:", error);
    return { success: false, error: error};
  }
};
