"use server";

import prisma from "@/lib/prisma";

export const getImageFromGalleryById = async (id: string) => {
  try {
    const image = await prisma.imagegallery.findUnique({
      where: { id },
    });
    return image;
  } catch (error) {
    console.error("Error al obtener la imagen:", error);
    return null;
  }
};
