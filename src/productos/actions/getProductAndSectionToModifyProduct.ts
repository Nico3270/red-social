"use server";

import prisma from "@/lib/prisma";

interface ProductAndSectionsResponse {
  product: {
    id: string;
    nombre: string;
    precio: number;
    descripcion: string;
    descripcionCorta?: string;
    slug: string;
    prioridad?: number;
    status: string;
    tags: string[];
    imagenes: { id: string; url: string }[];
    seccionIds: string[];
  };
  allSections: {
    id: string;
    nombre: string;
    slug: string;
    order: number;
    isActive: boolean;
  }[];
}

export async function getProductAndSectionToModifyProduct(
  productId: string
): Promise<ProductAndSectionsResponse | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      imagenes: true,
      secciones: {
        include: {
          section: true,
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const allSections = await prisma.section.findMany({
    orderBy: { order: "asc" },
  });

  return {
    product: {
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      descripcion: product.descripcion,
      descripcionCorta: product.descripcionCorta ?? undefined, // Convertir null a undefined
      slug: product.slug,
      prioridad: product.prioridad ?? undefined, // Convertir null a undefined
      status: product.status,
      tags: product.tags,
      imagenes: product.imagenes.map((img) => ({ id: img.id, url: img.url })),
      seccionIds: product.secciones.map((ps) => ps.section.id),
    },
    allSections: allSections.map((section) => ({
      id: section.id,
      nombre: section.nombre,
      slug: section.slug,
      order: section.order,
      isActive: section.isActive,
    })),
  };
}
