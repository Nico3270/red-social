// src/inicio/actions/getProductsToBlog.ts
"use server";

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
        imagenes: { select: { url: true } },
        descripcion: true,
        descripcionCorta: true,
        slug: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        componentes: true,
        secciones: {
          select: {
            sectionId: true,
            prioridad: true,
          },
        },
      },
      orderBy: {
        nombre: "asc",
      },
    });

    return products.map((product) => ({
      ...product,
      imagenes: product.imagenes.map((img: { url: string }) => img.url),
      seccionIds: product.secciones.map((sec) => sec.sectionId),
      sectionPriorities: product.secciones.reduce(
        (acc, sec) => ({
          ...acc,
          [sec.sectionId]: sec.prioridad ?? null,
        }),
        {}
      ),
      createdAt: product.createdAt ? product.createdAt.toISOString() : null,
      updatedAt: product.updatedAt ? product.updatedAt.toISOString() : null,
      componentes: product.componentes || [],
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}