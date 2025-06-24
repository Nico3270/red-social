"use server";

import prisma from "@/lib/prisma";

export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Buscar y eliminar la imagen por URL
    const deletedImage = await prisma.image.deleteMany({
      where: { url: imageUrl },
    });

    // Retorna verdadero si se eliminó al menos una imagen
    return deletedImage.count > 0;
  } catch (error) {
    console.error("Error al eliminar la imagen:", error);
    return false;
  }
}
