// /ui/actions/productos/getProductsByUser.ts
"use server";

import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";


interface GetProductsByUserResult {
  ok: boolean;
  products?: ProductRedSocial[];
  message?: string;
}

export async function getProductsByUser(id: string): Promise<GetProductsByUserResult> {
  // console.log("Iniciando getProductsByUser con id:", id);
  try {
    // console.log("Validando ID del usuario...");
    if (!id) {
      return { ok: false, message: "El ID del usuario es obligatorio." };
    }

    // Obtnener el negocio del usuario
    const negocio = await prisma.negocio.findUnique({
      where: { usuarioId: id },
      select: { id: true },
    });
    if (!negocio) {
      return { ok: false, message: "El usuario no tiene un negocio asociado." };
    }
    // console.log("Consultando productos del usuario...");
    const products = await prisma.product.findMany({
      where: { negocioId: negocio.id },
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
        categoryId: true,
        componentes: true,
        negocioId: true,
        category: {
          select: {
            nombre: true,
            slug: true,
          },
        },
        secciones: {
          select: {
            section: {
              select: {
                nombre: true,
                slug: true,
                id: true,
              },
            },
          },
        },
        imagenes: {
          select: {
            url: true,
          },
          take: 1, // Fetch only the first image
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // console.log("Productos encontrados:", products.length);

    // Transform the data to match the expected interface
    const formattedProducts = products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      descripcion: product.descripcion,
      descripcionCorta: product.descripcionCorta || "",
      prioridad: product.prioridad || 1,
      tags: product.tags || [],
      categoriaId: product.categoryId,
      componentes: product.componentes || [],
      negocioId: product.negocioId,
      nombreNegocio: product.negocioId, // Assuming negocioId is the business name
      slugNegocio: product.negocioId, // Assuming negocioId is the business slug
      telefonoContacto: product.negocioId, // Assuming negocioId is the contact phone
      imagenes: product.imagenes.map((img) => img.url), // Map to URLs
      seccionIds: product.secciones.map((s) => s.section.id), // Map to section IDs
      sections: product.secciones.map((s) => s.section.id),
      category: product.category,
      imagen: product.imagenes[0], // First image or undefined
      slug: product.slug,
      status: product.status
    }));

    return { ok: true, products: formattedProducts };
  } catch (error) {
    console.error("Error al obtener productos del usuario:", error);
    return { ok: false, message: "Error al obtener productos del usuario." };
  }
}