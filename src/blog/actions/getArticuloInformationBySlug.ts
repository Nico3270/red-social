"use server";
import prisma from "@/lib/prisma";

export async function getArticuloInformationBySlug(slug: string) {
  try {
    const blog = await prisma.articulo.findUnique({
      where: { slug },
      include: {
        secciones: { select: { section: true } }, // ✅ Obtiene las secciones
        products: { select: { product: true } }, // ✅ Obtiene los productos relacionados
        temas: true, // ✅ Obtiene los temas del blog
      },
    });

    return blog;
  } catch (error) {
    console.error("Error obteniendo el artículo:", error);
    return null;
  }
}
