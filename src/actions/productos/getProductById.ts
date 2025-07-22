// /ui/actions/productos/getProductById.ts
"use server";

import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";

interface Product {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  slug: string;
  prioridad: number;
  status: ProductStatus;
  tags: string[];
  categoriaId: string;
  imagenes: { id: string; url: string }[];
  componentes: string[];
  sections: { section: { id: string; slug: string } }[];
}

interface GetProductById {
  ok: boolean;
  product?: ProductRedSocial;
  message?: string;
  userId: string;
}

export async function getProductById(id: string): Promise<GetProductById> {
  console.log("Iniciando getProductById con id:", id);
  try {
    console.log("Validando ID del producto...");
    if (!id) {
      return { ok: false, message: "El ID del producto es obligatorio.", userId:"Error" };
    }

    console.log("Consultando producto...");
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
      },
    });

    if (!product) {
      console.log("Producto no encontrado para id:", id);
      return { ok: false, message: "Producto no encontrado.", userId:"Error" };
    }

    console.log("Producto encontrado:", product.id);

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
    };

    return { ok: true, product: formattedProduct, userId: product.negocioId };
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    return { ok: false, message: "Error al obtener el producto.", userId: "Error" };
  }
}