"use server";

import { buildPublicBusinessBySlugWhere } from "@/lib/business/publicBusinessVisibility";
import prisma from "@/lib/prisma";
import {
  reportOperationalError,
  reportOperationalWarning,
} from "@/lib/observability/operationalLogger";
import { ProductEtiquetaEspecial, ProductStatus } from "@prisma/client";

export interface PublicCatalogGroupProduct {
  id: string;
  productId: string;
  order: number;
  isFeatured: boolean;
  product: {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    descripcionCorta: string | null;
    precio: number;
    prioridad: number | null;
    status: ProductStatus;
    etiquetaEspecial: ProductEtiquetaEspecial | null;
    categoryId: string;
    negocioId: string;
    tags: string[];
    componentes: string[];
    stock: number | null;
    stockIlimitado: boolean | null;
    usaVariantes: boolean;
    secciones: Array<{ sectionId: string }>;
    variantes: Array<{
      id: string;
      nombre: string | null;
      sku: string | null;
      precio: number | null;
      stock: number | null;
      stockIlimitado: boolean | null;
      isActive: boolean;
      imagenUrl: string | null;
      orden: number;
      options: Array<{
        id: string;
        nombre: string;
        valor: string;
        orden: number;
      }>;
    }>;
    imagenes: Array<{ url: string }>;
    negocio: {
      nombre: string | null;
      slug: string | null;
      telefonoContacto: string | null;
      fotoPerfil: string | null;
    } | null;
  };
}

export interface GetGroupProductsResponse {
  ok: boolean;
  message: string;
  products?: PublicCatalogGroupProduct[];
  total?: number;
  error?: string;
}

/**
 * Obtiene productos públicos de un grupo específico.
 *
 * Validaciones:
 * - El grupo debe pertenecer al negocio
 * - El grupo debe estar activo
 * - Solo retorna productos disponibles
 * - Prioriza featured primero, luego order asc
 */
export async function getGroupProductsPublic(
  groupId: string,
  negocioSlug: string
): Promise<GetGroupProductsResponse> {
  try {
    if (!groupId || !negocioSlug) {
      reportOperationalWarning({
        area: "catalog-public",
        event: "group_products_missing_arguments",
        message: "La carga publica de productos de grupo se invoco sin groupId o negocioSlug.",
        context: { groupId, negocioSlug },
        dedupeKey: `group-products-missing-arguments:${groupId || "none"}:${negocioSlug || "none"}`,
      });

      return {
        ok: false,
        message: "groupId y negocioSlug son requeridos",
      };
    }

    const negocio = await prisma.negocio.findFirst({
      where: buildPublicBusinessBySlugWhere(negocioSlug),
      select: { id: true },
    });

    if (!negocio) {
      reportOperationalWarning({
        area: "catalog-public",
        event: "group_products_business_not_found",
        message: "No se encontro el negocio solicitado al cargar productos publicos por grupo.",
        context: { groupId, negocioSlug },
        dedupeKey: `group-products-business-not-found:${negocioSlug}`,
      });

      return {
        ok: false,
        message: "Negocio no encontrado",
      };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        negocioId: true,
        isActive: true,
      },
    });

    if (!group || group.negocioId !== negocio.id || !group.isActive) {
      reportOperationalWarning({
        area: "catalog-public",
        event: "group_products_invalid_group",
        message: "El grupo solicitado no esta disponible para el negocio publico actual.",
        context: {
          groupId,
          negocioSlug,
          negocioId: negocio.id,
          groupNegocioId: group?.negocioId,
          groupIsActive: group?.isActive,
        },
        dedupeKey: `group-products-invalid-group:${negocioSlug}:${groupId}`,
      });

      return {
        ok: false,
        message: "Grupo no encontrado o no activo",
      };
    }

    const products = await prisma.catalogGroupProduct.findMany({
      where: {
        catalogGroupId: groupId,
        product: {
          is: {
            status: "disponible",
          },
        },
      },
      select: {
        id: true,
        productId: true,
        order: true,
        isFeatured: true,
        product: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            descripcion: true,
            descripcionCorta: true,
            precio: true,
            prioridad: true,
            status: true,
            etiquetaEspecial: true,
            categoryId: true,
            negocioId: true,
            tags: true,
            componentes: true,
            stock: true,
            stockIlimitado: true,
            usaVariantes: true,
            secciones: {
              select: {
                sectionId: true,
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
            imagenes: {
              select: { url: true },
            },
            negocio: {
              select: {
                nombre: true,
                slug: true,
                telefonoContacto: true,
                fotoPerfil: true,
              },
            },
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
    });

    return {
      ok: true,
      message: "Productos obtenidos exitosamente",
      products,
      total: products.length,
    };
  } catch (error) {
    reportOperationalError({
      area: "catalog-public",
      event: "group_products_query_failed",
      message: "Fallo la carga publica de productos para el grupo solicitado.",
      context: { groupId, negocioSlug },
      error,
      dedupeKey: `group-products-query-failed:${negocioSlug}:${groupId}`,
    });

    return {
      ok: false,
      message: "Error al obtener productos del grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
