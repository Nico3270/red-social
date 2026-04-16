// /ui/actions/productos/getProductById.ts
"use server";

import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";



interface GetProductById {
  ok: boolean;
  product?: ProductRedSocial;
  message?: string;
  userId: string;
}

export async function getProductById(id: string): Promise<GetProductById> {
  // console.log("Iniciando getProductById con id:", id);
  try {
    // console.log("Validando ID del producto...");
    if (!id) {
      return { ok: false, message: "El ID del producto es obligatorio.", userId:"Error" };
    }

    // console.log("Consultando producto...");
    const product = await prisma.product.findUnique({
      where: { id },
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
        stock: true,
        stockIlimitado: true,
        usaVariantes: true,
        negocio: {
          select: {
            fotoPerfil: true,
          },
        },
        imagenes: {
          select: {
            url: true,
          },
        },
        secciones: {
          select: {
            section: {
              select: {

                slug: true,
                id: true,
              },
            },
          },
        },
        atributos: {
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
        variantes: {
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

    if (!product) {
      // console.log("Producto no encontrado para id:", id);
      return { ok: false, message: "Producto no encontrado.", userId:"Error" };
    }

    // console.log("Producto encontrado:", product.id);

    // Transform the data to match the Product interface
    const formattedProduct: ProductRedSocial = {
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      descripcion: product.descripcion,
      descripcionCorta: product.descripcionCorta   || "",
      slug: product.slug,
      prioridad: product.prioridad || 1,
      status: product.status,
      tags: product.tags,
      categoriaId: product.categoryId,
      componentes: product.componentes,
      imagenes: product.imagenes.map((img)=>img.url),
      sections: product.secciones.map((s) => s.section.id),
      negocioId: product.negocioId,
      negocioFotoPerfil: product.negocio.fotoPerfil || "", // Este campo no está en la consulta original
      stock: product.stock,
      stockIlimitado: product.stockIlimitado,
      usaVariantes: product.usaVariantes,
      atributos: product.atributos.map((atributo) => ({
        id: atributo.id,
        nombre: atributo.nombre,
        valor: atributo.valor,
        orden: atributo.orden,
      })),
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
    };

    return { ok: true, product: formattedProduct, userId: product.negocioId };
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    return { ok: false, message: "Error al obtener el producto.", userId: "Error" };
  }
}
