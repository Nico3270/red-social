"use server";

import prisma from "@/lib/prisma";

export const getVideoFromGalleryById = async (id: string) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id },
    });
    return video;
  } catch (error) {
    console.error("Error al obtener el video:", error);
    return null;
  }
};
