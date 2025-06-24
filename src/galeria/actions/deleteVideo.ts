"use server";

import prisma from "@/lib/prisma";

export const deleteVideo = async (videoId: string): Promise<
  | { success: true }
  | { success: false; error: string }
> => {
  try {
    await prisma.video.delete({
      where: { id: videoId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar el video:", error);
    return { success: false, error: "No se pudo eliminar el video." };
  }
};
