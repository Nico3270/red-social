"use server";

import prisma from "@/lib/prisma";

export const updateGalleryImage = async ({
  id,
  url,
  title,
  description,
  order,
}: {
  id: string;
  url: string;
  title: string;
  description: string;
  order: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    await prisma.imagegallery.update({
      where: { id },
      data: { url, title, description, order },
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar la imagen:", error);
    return { success: false, error: "No se pudo actualizar la imagen." };
  }
};
