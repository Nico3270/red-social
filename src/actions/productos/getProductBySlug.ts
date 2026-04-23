"use server";

import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import {
  buildPublicBusinessByIdWhere,
  buildPublicBusinessRelationWhere,
} from "@/lib/business/publicBusinessVisibility";
import { logProductImageDiagnostics } from "@/lib/media/productImageDiagnostics";
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";

interface GetProductBySlug {
  ok: boolean;
  product?: ProductRedSocial;
  message?: string;
  userId: string;
  productosSimilares?: ProductRedSocial[];
  telefonoNegocio?: string;
  nombreNegocio?: string;
}

export const getProductBySlug = async (
  slug: string
): Promise<GetProductBySlug> => {
  try {
    if (!slug) {
      return {
        ok: false,
        message: "El slug del producto es obligatorio.",
        userId: "",
        productosSimilares: [],
        telefonoNegocio: "",
        nombreNegocio: "",
      };
    }

    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.disponible,
        negocio: buildPublicBusinessRelationWhere(),
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        descripcion: true,
        descripcionCorta: true,
        slug: true,
        prioridad: true,
        status: true,
        etiquetaEspecial: true,
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
                id: true,
                slug: true,
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

    if (!product) {
      return {
        ok: false,
        message: "Producto no encontrado.",
        userId: "",
        productosSimilares: [],
        telefonoNegocio: "",
        nombreNegocio: "",
      };
    }

    const negocio = await prisma.negocio.findFirst({
      where: buildPublicBusinessByIdWhere(product.negocioId),
      select: {
        nombre: true,
        telefonoContacto: true,
        slug: true,
      },
    });

    const productFormatted: ProductRedSocial = {
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      descripcion: product.descripcion,
      descripcionCorta: product.descripcionCorta,
      slug: product.slug,
      prioridad: product.prioridad,
      status: product.status,
      etiquetaEspecial: product.etiquetaEspecial,
      tags: product.tags,
      categoriaId: product.categoryId,
      componentes: product.componentes,
      imagenes: product.imagenes.map((img) => img.url),
      sections: product.secciones.map((seccion) => seccion.section.id),
      slugNegocio: negocio?.slug || "",
      nombreNegocio: negocio?.nombre || "",
      telefonoContacto: negocio?.telefonoContacto || "",
      negocioId: product.negocioId,
      negocioFotoPerfil: product.negocio.fotoPerfil || "",
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

    logProductImageDiagnostics({
      area: "product-detail-query",
      event: "detail_images_loaded",
      message: "Imágenes devueltas por getProductBySlug para el detalle público.",
      product: {
        id: productFormatted.id,
        slug: productFormatted.slug,
        nombre: productFormatted.nombre,
        status: productFormatted.status,
        negocioSlug: productFormatted.slugNegocio,
      },
      imageUrls: productFormatted.imagenes,
      selectedImageUrl: productFormatted.imagenes[0],
      context: {
        source: "getProductBySlug",
        requestedSlug: slug,
      },
      dedupeKey: `product-detail-images:${productFormatted.id}:${productFormatted.imagenes.join("|")}`,
    });

    if (!negocio) {
      return {
        ok: true,
        message: "Negocio no encontrado.",
        userId: product.negocioId,
        productosSimilares: [],
        telefonoNegocio: "",
        nombreNegocio: "",
        product: productFormatted,
      };
    }

    const productosSimilares = await prisma.product.findMany({
      where: {
        negocioId: product.negocioId,
        categoryId: product.categoryId,
        id: { not: product.id },
        status: ProductStatus.disponible,
        negocio: buildPublicBusinessRelationWhere(),
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        descripcion: true,
        descripcionCorta: true,
        slug: true,
        prioridad: true,
        status: true,
        etiquetaEspecial: true,
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
                id: true,
                slug: true,
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
      take: 4,
      orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
    });

    const formattedProductosSimilares: ProductRedSocial[] = productosSimilares.map(
      (p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        descripcion: p.descripcion,
        descripcionCorta: p.descripcionCorta,
        slug: p.slug,
        prioridad: p.prioridad,
        status: p.status,
        etiquetaEspecial: p.etiquetaEspecial,
        tags: p.tags,
        categoriaId: p.categoryId,
        componentes: p.componentes,
        imagenes: p.imagenes.map((img) => img.url),
        sections: p.secciones.map((seccion) => seccion.section.id),
        telefonoContacto: negocio.telefonoContacto || "",
        slugNegocio: negocio.slug || "",
        nombreNegocio: negocio.nombre || "",
        negocioId: p.negocioId,
        negocioFotoPerfil: p.negocio.fotoPerfil || "",
        stock: p.stock,
        stockIlimitado: p.stockIlimitado,
        usaVariantes: p.usaVariantes,
        atributos: p.atributos.map((atributo) => ({
          id: atributo.id,
          nombre: atributo.nombre,
          valor: atributo.valor,
          orden: atributo.orden,
        })),
        variantes: p.variantes.map((variante) => ({
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
      })
    );

    return {
      ok: true,
      product: productFormatted,
      userId: product.negocioId,
      productosSimilares: formattedProductosSimilares,
      telefonoNegocio: negocio.telefonoContacto || "",
      nombreNegocio: negocio.nombre || "",
    };
  } catch (error) {
    console.error("Error al obtener el producto:", error);

    return {
      ok: false,
      message: "Error al obtener el producto.",
      userId: "",
      productosSimilares: [],
      telefonoNegocio: "",
      nombreNegocio: "",
    };
  }
};
