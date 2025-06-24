"use server";

import { v2 as cloudinary } from "cloudinary";
import prisma from "@/lib/prisma";

export const deleteImage = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const image = await prisma.imagegallery.findUnique({ where: { id } });

    if (image) {
      const publicId = image.url.split("/").pop()?.split(".")[0]; // Extraer public_id
      await cloudinary.uploader.destroy(`gallery/${publicId}`);
    }

    await prisma.imagegallery.delete({ where: { id } });

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar la imagen:", error);
    return { success: false, error: "No se pudo eliminar la imagen." };
  }
};
