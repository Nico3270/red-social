import prisma from "@/lib/prisma";

export async function getProductsToBlog(query: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        nombre: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        descripcion: true,
        descripcionCorta: true,
        slug: true,
        prioridad: true,
        status: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        componentes: true,

        imagenes: {
          select: { url: true },
        },

        secciones: {
          select: {
            sectionId: true,
            prioridad: true,
          },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio ?? 0,
      prioridad: product.prioridad ?? 0,
      status: (product.status as "available" | "out_of_stock" | "discontinued") ?? "available", // ✅ Corrección
      descripcion: product.descripcion,
      descripcionCorta: product.descripcionCorta ?? "",
      slug: product.slug,
      tags: product.tags ?? [],
      createdAt: product.createdAt ? product.createdAt.toISOString() : null,
      updatedAt: product.updatedAt ? product.updatedAt.toISOString() : null,
      componentes: product.componentes ?? [],

      imagenes: product.imagenes.length > 0 ? product.imagenes.map((img) => img.url) : [],

      seccionIds: product.secciones.length > 0 ? product.secciones.map((sec) => sec.sectionId) : [],

      sectionPriorities: product.secciones.length > 0
        ? Object.fromEntries(product.secciones.map((sec) => [sec.sectionId, sec.prioridad]))
        : {},
    }));
  } catch (error) {
    console.error("❌ Error al obtener productos:", error);
    return [];
  }
}
