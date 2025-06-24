"use server";

import prisma from "@/lib/prisma";

export const updateVideosOrder = async (updatedVideos: { id: string; order: number }[]) => {
  try {
    const promises = updatedVideos.map((video) =>
      prisma.video.update({
        where: { id: video.id },
        data: { order: video.order },
      })
    );
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el orden de los videos:", error);
    return { success: false, error: "No se pudo actualizar el orden de los videos." };
  }
};
