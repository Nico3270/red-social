"use server";

import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";

interface ProductosNegocioBySlug {
  ok: boolean;
  products?: ProductRedSocial[];
  message?: string;
}

export const getNegocioProductsBySlug = async (
  slug: string,
  take?: number,
  skip?: number
): Promise<ProductosNegocioBySlug> => {
  try {
    console.log("Iniciando getNegocioProductsBySlug con slug:", slug, "take:", take, "skip:", skip);

    if (!slug) {
      return { ok: false, message: "El slug del negocio es obligatorio." };
    }
    // console.log("slug del negocio", { slug });

    const products = await prisma.product.findMany({
      where: { negocio: { slug } },
      take: take || 10,
      skip: skip || 0,
      select: {
        id: true,
        nombre: true,
        precio: true,
        slug: true,
        status: true,
        descripcion: true,
        descripcionCorta: true,
        prioridad: true,
        tags: true,
        categoryId: true,
        componentes: true,
        stock: true,
        stockIlimitado: true,
        usaVariantes: true,
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
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            telefonoContacto: true,
            fotoPerfil: true
            
          },
        },
        imagenes: {
          select: {
            url: true,
          },
        },
        variantes: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            nombre: true,
            sku: true,
            precio: true,
            stock: true,
            stockIlimitado: true,
            isActive: true,
            imagenUrl: true,
            orden: true,
            options: {
              select: {
                id: true,
                nombre: true,
                valor: true,
                orden: true,
              },
              orderBy: {
                orden: "asc",
              },
            },
          },
          orderBy: {
            orden: "asc",
          },
        },
      },
    });
    // console.log({ products });

    if (!products || products.length === 0) {
      return { ok: true, products: [], message: "No hay más productos." }; // Cambio clave aquí
    }

    const formattedProducts: ProductRedSocial[] = products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      descripcion: product.descripcion || "",
      descripcionCorta: product.descripcionCorta || "",
      slug: product.slug,
      prioridad: product.prioridad || 1,
      status: product.status,
      tags: product.tags,
      categoriaId: product.categoryId,
      imagenes: product.imagenes.map((img) => img.url),
      componentes: product.componentes,
      sections: product.secciones.map((s) => s.section.id),
      slugNegocio: product.negocio.slug,
      nombreNegocio: product.negocio.nombre,
      telefonoContacto: product.negocio.telefonoContacto || "",
      negocioId: product.negocio.id,
      negocioFotoPerfil: product.negocio.fotoPerfil || "imgs/admin-avatar.webp",
      stock: product.stock,
      stockIlimitado: product.stockIlimitado,
      usaVariantes: product.usaVariantes,
      variantes: product.variantes.map((variante) => ({
        id: variante.id,
        nombre: variante.nombre,
        sku: variante.sku,
        precio: variante.precio,
        stock: variante.stock,
        stockIlimitado: variante.stockIlimitado,
        isActive: variante.isActive,
        imagenUrl: variante.imagenUrl,
        orden: variante.orden,
        options: variante.options.map((option) => ({
          id: option.id,
          nombre: option.nombre,
          valor: option.valor,
          orden: option.orden,
        })),
      })),
    }));

    return { ok: true, products: formattedProducts, message: "productos obtenidos exitosamente" };
  } catch (error) {
    console.error("Error en getNegocioProductsBySlug:", error);
    return { ok: false, message: "Error al obtener los productos del negocio." };
  }
};
