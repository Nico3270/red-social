"use server";

import { Product } from "@/interfaces/product.interface";
import prisma from "@/lib/prisma";

interface GetProductsParams {
  page: number;
  pageSize: number;
}

export async function getProductsToDashboard({
  page,
  pageSize,
}: GetProductsParams): Promise<{
  products: Product[];
  total: number;
  currentPage: number;
  totalPages: number;
}> {
  const skip = (page - 1) * pageSize;

  // Filtra los productos que no están descontinuados
  const total = await prisma.product.count({
    where: {
      status: {
        not: "discontinued",
      },
    },
  });

  const products = await prisma.product.findMany({
    skip,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    where: {
      status: {
        not: "discontinued",
      },
    },
    include: {
      secciones: true,
      imagenes: true,
    },
  });

  const mappedProducts: Product[] = products.map((product) => ({
    id: product.id,
    nombre: product.nombre,
    precio: product.precio,
    descripcion: product.descripcion,
    seccionIds: product.secciones.map((section) => section.sectionId),
    descripcionCorta: product.descripcionCorta || "",
    slug: product.slug,
    tags: product.tags,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    prioridad: product.prioridad || 0,
    status: product.status as "available" | "out_of_stock" | "discontinued",
    imagenes: product.imagenes.map((image) => image.url),
  }));

  return {
    products: mappedProducts,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / pageSize),
  };
}
