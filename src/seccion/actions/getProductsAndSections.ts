// actions/getProductsAndSections.js
"use server";

import prisma  from "@/lib/prisma"; // Ajusta la ruta según tu configuración

export async function getProductsAndSections() {
  const sections = await prisma.section.findMany({
    where: { isActive: true },
    select: {
      id: true,
      nombre: true,
      slug: true,
      products: {
        select: {
          productId: true, // Cambiamos a productId directamente desde ProductSection
          prioridad: true,
          product: {
            select: {
              nombre: true,
              precio: true,
            },
          },
        },
        orderBy: { prioridad: "asc" }, // Este orden se ajustará en el cliente
      },
    },
    orderBy: { order: "asc" },
  });

  const formattedSections = sections.map((section) => ({
    id: section.id,
    nombre: section.nombre,
    slug: section.slug,
    products: section.products.map((productSection) => ({
      id: productSection.productId, // Usamos productId de ProductSection
      nombre: productSection.product.nombre,
      precio: productSection.product.precio,
      prioridad: productSection.prioridad,
    })),
  }));

  return { success: true, data: formattedSections };
}