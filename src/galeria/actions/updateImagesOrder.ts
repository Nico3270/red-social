"use server"

import prisma from "@/lib/prisma";

export const updateImagesOrder = async (updatedImages: { id: string; order: number }[]) => {
    try {
      const promises = updatedImages.map((image) =>
        prisma.imagegallery.update({
          where: { id: image.id },
          data: { order: image.order },
        })
      );
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      console.error("Error al actualizar el orden de las imágenes:", error);
      return { success: false, error: "No se pudo actualizar el orden de las imágenes." };
    }
  };
  