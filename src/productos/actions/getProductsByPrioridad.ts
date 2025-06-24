"use server";

import prisma from "@/lib/prisma";
import { Product } from "@/interfaces/product.interface";

interface GetProductsByPriorityInput {
  page: number;
  pageSize: number;
}

// Define la función para obtener todos los productos ordenados por prioridad
export const getProductsByPriority = async ({
  page,
  pageSize,
}: GetProductsByPriorityInput): Promise<{ products: Product[]; total: number }> => {
  try {
    const skip = (page - 1) * pageSize; // Calcular el índice de inicio
    const take = pageSize; // Cantidad de productos por página

    // Consulta a la base de datos para obtener los productos ordenados por prioridad
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: {
            not: "discontinued", // Filtrar productos que no estén descontinuados
          },
        },
        orderBy: {
          prioridad: "asc", // Ordenar por prioridad (de menor a mayor)
        },
        skip,
        take,
        include: {
          imagenes: true, // Incluir imágenes relacionadas
          secciones: true, // Incluir secciones relacionadas
        },
      }),
      prisma.product.count({
        where: {
          status: {
            not: "discontinued", // Contar solo productos no descontinuados
          },
        },
      }),
    ]);

    // Formatea los productos para que coincidan con la interfaz Product
    const formattedProducts: Product[] = products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagenes: product.imagenes.map((img) => img.url), // Extraer las URLs de las imágenes
      descripcion: product.descripcion,
      seccionIds: product.secciones.map((s) => s.sectionId), // Extraer los IDs de las secciones
      descripcionCorta: product.descripcionCorta || "",
      slug: product.slug,
      tags: product.tags,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      prioridad: product.prioridad ?? undefined,
      status: product.status as "available" | "out_of_stock" | "discontinued",
    }));

    return { products: formattedProducts, total };
  } catch (error) {
    console.error("Error al obtener productos por prioridad:", error);
    return { products: [], total: 0 };
  }
};
