import prisma from "@/lib/prisma";

export async function getArticlesCarrusel() {
  return await prisma.articulo.findMany({
    select: {
      titulo: true,
      descripcion: true,
      imagen: true,
      slug: true,
    },
    orderBy: { orden: "asc" }, // Ordenar por la propiedad "orden" de menor a mayor
    take: 10, // Límite de artículos para el carrusel
  });
}
