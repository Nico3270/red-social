"use server";

import prisma from "@/lib/prisma";
import { Product } from "@/interfaces/product.interface";

export const getProductsCarruselBySlug = async (slug: string): Promise<Product[]> => {
  try {
    // Buscar el artículo relacionado con el slug
    const article = await prisma.articulo.findUnique({
      where: { slug },
      include: {
        secciones: true, // Relacionar con secciones si existen
      },
    });

    if (!article) {
      console.error("No se encontró el artículo para el slug:", slug);
      return [];
    }

    // Verificar si hay secciones relacionadas al artículo
    const sectionIds = article.secciones.map((section) => section.sectionId);

    // Si tiene secciones, buscar productos de estas secciones
    if (sectionIds.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          secciones: {
            some: {
              sectionId: { in: sectionIds },
            },
          },
        },
        orderBy: { prioridad: "asc" }, // Ordenar por prioridad
        take: 6, // Limitar a 6 productos
        include: {
          imagenes: true,
          secciones: true, // Incluye las secciones para mapear `seccionIds`
        },
      });

      return products.map((product) => ({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagenes: product.imagenes.map((img) => img.url),
        descripcion: product.descripcion,
        seccionIds: product.secciones.map((s) => s.sectionId), // Mapear `seccionIds`
        descripcionCorta: product.descripcionCorta || "",
        slug: product.slug,
        tags: product.tags,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        prioridad: product.prioridad ?? undefined,
        status: product.status as "available" | "out_of_stock" | "discontinued",
      }));
    }

    // Si no tiene secciones, buscar productos de diferentes secciones
    const products = await prisma.product.findMany({
      orderBy: { prioridad: "asc" },
      take: 6,
      include: {
        imagenes: true,
        secciones: true, // Incluye las secciones para mapear `seccionIds`
      },
    });

    return products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagenes: product.imagenes.map((img) => img.url),
      descripcion: product.descripcion,
      seccionIds: product.secciones.map((s) => s.sectionId), // Mapear `seccionIds`
      descripcionCorta: product.descripcionCorta || "",
      slug: product.slug,
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
