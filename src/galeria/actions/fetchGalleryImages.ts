import prisma from "@/lib/prisma";


export const fetchGalleryImages = async () => {
  try {
    const images = await prisma.imagegallery.findMany({
      orderBy: [{
        order: "asc", // Ordenar de menor a mayor por el campo `order`
      },
      { updatedAt: "desc" },
      { createdAt: "desc" }],
    });
    return images;
  } catch (error) {
    console.error("Error al obtener las imágenes:", error);
    return [];
  }
};
