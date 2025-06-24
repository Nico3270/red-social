"use server";

import prisma from "@/lib/prisma";
import { Product } from "@/interfaces/product.interface";

export const getProductsCarrusel = async (): Promise<Product[]> => {
  try {
    // Obtener productos por secciones
    const products = await prisma.product.findMany({
      orderBy: { prioridad: "asc" }, // Ordenar por prioridad
      include: {
        imagenes: true, // Incluir imágenes
        secciones: true, // Incluir secciones relacionadas
      },
    });

    // Mapear productos a la estructura esperada
    return products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagenes: product.imagenes.map((img) => img.url),
      descripcion: product.descripcion,
      descripcionCorta: product.descripcionCorta || "",
      slug: product.slug,
      seccionIds: product.secciones.map((s) => s.sectionId), // Mapear `seccionIds`
      tags: product.tags,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      prioridad: product.prioridad ?? undefined,
      status: product.status as "available" | "out_of_stock" | "discontinued",
    }));
  } catch (error) {
    console.error("Error al obtener productos para el carrusel:", error);
    return [];
  }
};
