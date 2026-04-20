"use server";

import prisma from "@/lib/prisma";
import { PLACEHOLDER_BUSINESS_IMAGE } from "@/lib/media/resolveSafeImageSource";
import {
  reportOperationalError,
  reportOperationalWarning,
} from "@/lib/observability/operationalLogger";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";

export interface GetUngroupedProductsPublicResponse {
  ok: boolean;
  message: string;
  products?: ProductRedSocial[];
  total?: number;
  error?: string;
}

export async function getUngroupedProductsPublic(
  negocioSlug: string
): Promise<GetUngroupedProductsPublicResponse> {
  try {
    if (!negocioSlug) {
      reportOperationalWarning({
        area: "catalog-public",
        event: "ungrouped_products_missing_business_slug",
        message:
          "La carga pública de productos sin grupo se invocó sin negocioSlug.",
        context: { negocioSlug },
        dedupeKey: "ungrouped-products-missing-business-slug",
      });

      return {
        ok: false,
        message: "El slug del negocio es obligatorio.",
      };
    }

    const negocio = await prisma.negocio.findUnique({
      where: { slug: negocioSlug },
      select: { id: true },
    });

    if (!negocio) {
      reportOperationalWarning({
        area: "catalog-public",
        event: "ungrouped_products_business_not_found",
        message:
          "No se encontró el negocio solicitado al cargar productos públicos sin grupo.",
        context: { negocioSlug },
        dedupeKey: `ungrouped-products-business-not-found:${negocioSlug}`,
      });

      return {
        ok: false,
        message: "Negocio no encontrado",
      };
    }

    const products = await prisma.product.findMany({
      where: {
        negocioId: negocio.id,
        status: "disponible",
        // Consideramos “sin grupo público” todo producto que no tenga
        // asignaciones activas visibles dentro de CatalogGroups.
        catalogGroupProducts: {
          none: {
            catalogGroup: {
              isActive: true,
            },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        slug: true,
        status: true,
        etiquetaEspecial: true,
        descripcion: true,
        descripcionCorta: true,
        prioridad: true,
        tags: true,
        categoryId: true,
        componentes: true,
        stock: true,
        stockIlimitado: true,
        usaVariantes: true,
        secciones: {
          select: {
            section: {
              select: {
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
            fotoPerfil: true,
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
      orderBy: [{ prioridad: "desc" }, { nombre: "asc" }],
    });

    return {
      ok: true,
      message: "Productos sin grupo obtenidos exitosamente",
      products: products.map((product) => ({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        descripcion: product.descripcion || "",
        descripcionCorta: product.descripcionCorta || "",
        slug: product.slug,
        prioridad: product.prioridad || 0,
        status: product.status,
        etiquetaEspecial: product.etiquetaEspecial,
        tags: product.tags,
        categoriaId: product.categoryId,
        imagenes: product.imagenes.map((img) => img.url),
        componentes: product.componentes,
        sections: product.secciones.map((section) => section.section.id),
        slugNegocio: product.negocio?.slug || negocioSlug,
        nombreNegocio: product.negocio?.nombre || "",
        telefonoContacto: product.negocio?.telefonoContacto || "",
        negocioId: product.negocio?.id || negocio.id,
        negocioFotoPerfil: product.negocio?.fotoPerfil || PLACEHOLDER_BUSINESS_IMAGE,
        stock: product.stock,
        stockIlimitado: product.stockIlimitado ?? true,
        usaVariantes: product.usaVariantes,
        variantes: product.variantes.map((variant) => ({
          id: variant.id,
          nombre: variant.nombre,
          sku: variant.sku,
          precio: variant.precio,
          stock: variant.stock,
          stockIlimitado: variant.stockIlimitado ?? true,
          isActive: variant.isActive,
          imagenUrl: variant.imagenUrl,
          orden: variant.orden,
          options: variant.options.map((option) => ({
            id: option.id,
            nombre: option.nombre,
            valor: option.valor,
            orden: option.orden,
          })),
        })),
      })),
      total: products.length,
    };
  } catch (error) {
    reportOperationalError({
      area: "catalog-public",
      event: "ungrouped_products_query_failed",
      message: "Falló la carga pública de productos sin grupo activo.",
      context: { negocioSlug },
      error,
      dedupeKey: `ungrouped-products-query-failed:${negocioSlug}`,
    });

    return {
      ok: false,
      message: "Error al obtener productos sin grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
