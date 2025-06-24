"use server";

import prisma from "@/lib/prisma";

export const updateGalleryVideo = async ({
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
    await prisma.video.update({
      where: { id },
      data: { url, title, description, order },
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el video:", error);
    return { success: false, error: "No se pudo actualizar el video." };
  }
};
