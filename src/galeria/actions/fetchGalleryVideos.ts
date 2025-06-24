"use server";

import prisma from "@/lib/prisma";

export const fetchGalleryVideos = async () => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: [{
        order: "asc", // Ordenar de menor a mayor por el campo `order`
      },
      { updatedAt: "desc" },
      { createdAt: "desc" }],
    });
    return videos;
  } catch (error) {
    console.error("Error al obtener los videos:", error);
    return [];
  }
};
