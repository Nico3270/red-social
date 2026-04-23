"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  AssignProductToCatalogGroupInput,
  AssignProductResponse,
  CatalogGroupProduct,
} from "@/interfaces/catalogGroup.interface";
import { revalidateCatalogGroupCache } from "./revalidateCatalogGroupCache";

export interface SaveCatalogGroupProductsBatchInput {
  catalogGroupId: string;
  products: Array<{
    productId: string;
    order?: number;
    isFeatured?: boolean;
  }>;
}

export interface SaveCatalogGroupProductsBatchResponse {
  ok: boolean;
  message: string;
  catalogGroupProducts?: CatalogGroupProduct[];
  summary?: {
    added: number;
    removed: number;
    kept: number;
  };
  error?: string;
}

const normalizeBatchProducts = (
  products: SaveCatalogGroupProductsBatchInput["products"]
) =>
  products.map((product, index) => ({
    productId: product.productId,
    order: index,
    isFeatured: product.isFeatured ?? false,
  }));

/**
 * Persiste el estado final de productos de un grupo en un solo golpe.
 * El cliente puede editar localmente altas, bajas, orden y destacados y guardar al final.
 */
export async function saveCatalogGroupProductsBatch(
  input: SaveCatalogGroupProductsBatchInput
): Promise<SaveCatalogGroupProductsBatchResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true, slug: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const negocioId = usuario.negocio.id;
    const normalizedProducts = normalizeBatchProducts(input.products);
    const finalProductIds = normalizedProducts.map((product) => product.productId);
    const uniqueProductIds = new Set(finalProductIds);

    if (uniqueProductIds.size !== finalProductIds.length) {
      return {
        ok: false,
        message: "Hay productos duplicados en el grupo. Revisa la selección.",
      };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: input.catalogGroupId },
      select: { negocioId: true },
    });

    if (!group || group.negocioId !== negocioId) {
      return {
        ok: false,
        message: "Grupo no encontrado o no pertenece a tu negocio",
      };
    }

    if (finalProductIds.length > 0) {
      const validProducts = await prisma.product.findMany({
        where: {
          id: { in: finalProductIds },
          negocioId,
        },
        select: { id: true },
      });

      if (validProducts.length !== uniqueProductIds.size) {
        return {
          ok: false,
          message: "Uno o más productos no pertenecen a tu negocio",
        };
      }
    }

    const existingAssignments = await prisma.catalogGroupProduct.findMany({
      where: { catalogGroupId: input.catalogGroupId },
      select: { productId: true },
    });
    const existingProductIds = new Set(
      existingAssignments.map((assignment) => assignment.productId)
    );

    const catalogGroupProducts = await prisma.$transaction(async (tx) => {
      await tx.catalogGroupProduct.deleteMany({
        where: {
          catalogGroupId: input.catalogGroupId,
          ...(finalProductIds.length > 0
            ? { productId: { notIn: finalProductIds } }
            : {}),
        },
      });

      const savedAssignments = [];

      for (const product of normalizedProducts) {
        const assignment = await tx.catalogGroupProduct.upsert({
          where: {
            catalogGroupId_productId: {
              catalogGroupId: input.catalogGroupId,
              productId: product.productId,
            },
          },
          create: {
            catalogGroupId: input.catalogGroupId,
            productId: product.productId,
            order: product.order,
            isFeatured: product.isFeatured,
          },
          update: {
            order: product.order,
            isFeatured: product.isFeatured,
          },
        });

        savedAssignments.push(assignment);
      }

      return savedAssignments.sort((left, right) => left.order - right.order);
    });

    revalidateCatalogGroupCache(usuario.negocio.slug);

    const finalProductIdSet = new Set(finalProductIds);
    const added = finalProductIds.filter(
      (productId) => !existingProductIds.has(productId)
    ).length;
    const removed = existingAssignments.filter(
      (assignment) => !finalProductIdSet.has(assignment.productId)
    ).length;

    return {
      ok: true,
      message: "Cambios del grupo guardados exitosamente",
      catalogGroupProducts,
      summary: {
        added,
        removed,
        kept: finalProductIds.length - added,
      },
    };
  } catch (error) {
    console.error("Error en saveCatalogGroupProductsBatch:", error);
    return {
      ok: false,
      message: "Error al guardar productos del grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Asigna un producto a un grupo de catálogo
 * Validaciones:
 * - Usuario debe estar autenticado
 * - El grupo debe pertenecer al negocio del usuario
 * - El producto debe pertenecer al negocio del usuario
 * - No debe haber asignación duplicada
 */
export async function assignProductToCatalogGroup(
  input: AssignProductToCatalogGroupInput
): Promise<AssignProductResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true, slug: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const negocioId = usuario.negocio.id;

    // Validar que el grupo pertenece al negocio
    const group = await prisma.catalogGroup.findUnique({
      where: { id: input.catalogGroupId },
      select: { negocioId: true },
    });

    if (!group) {
      return { ok: false, message: "Grupo no encontrado" };
    }

    if (group.negocioId !== negocioId) {
      return { ok: false, message: "Grupo no pertenece a tu negocio" };
    }

    // Validar que el producto pertenece al negocio
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { negocioId: true },
    });

    if (!product) {
      return { ok: false, message: "Producto no encontrado" };
    }

    if (product.negocioId !== negocioId) {
      return { ok: false, message: "Producto no pertenece a tu negocio" };
    }

    // Verificar que no existe ya una asignación
    const existingAssignment = await prisma.catalogGroupProduct.findUnique({
      where: {
        catalogGroupId_productId: {
          catalogGroupId: input.catalogGroupId,
          productId: input.productId,
        },
      },
    });

    if (existingAssignment) {
      return {
        ok: false,
        message: "Este producto ya está asignado a este grupo",
      };
    }

    // Obtener el próximo order si no se especifica
    let order = input.order ?? 0;
    if (order === 0) {
      const lastAssignment = await prisma.catalogGroupProduct.findFirst({
        where: { catalogGroupId: input.catalogGroupId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (lastAssignment?.order ?? -1) + 1;
    }

    // Crear la asignación
    const catalogGroupProduct = await prisma.catalogGroupProduct.create({
      data: {
        catalogGroupId: input.catalogGroupId,
        productId: input.productId,
        order,
        isFeatured: input.isFeatured ?? false,
      },
    });

    revalidateCatalogGroupCache(usuario.negocio.slug);

    return {
      ok: true,
      message: "Producto asignado al grupo exitosamente",
      catalogGroupProduct,
    };
  } catch (error) {
    console.error("Error en assignProductToCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al asignar producto",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Remueve un producto de un grupo de catálogo
 */
export async function removeProductFromCatalogGroup(
  catalogGroupProductId: string
): Promise<AssignProductResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true, slug: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    // Verificar que la asignación pertenece al negocio
    const assignment = await prisma.catalogGroupProduct.findUnique({
      where: { id: catalogGroupProductId },
      select: {
        catalogGroupId: true,
        order: true,
        catalogGroup: { select: { negocioId: true } },
      },
    });

    if (!assignment) {
      return { ok: false, message: "Asignación no encontrada" };
    }

    if (assignment.catalogGroup.negocioId !== usuario.negocio.id) {
      return {
        ok: false,
        message: "No tienes permiso para remover este producto",
      };
    }

    // Eliminar la asignación
    await prisma.catalogGroupProduct.delete({
      where: { id: catalogGroupProductId },
    });

    revalidateCatalogGroupCache(usuario.negocio.slug);

    return {
      ok: true,
      message: "Producto removido del grupo exitosamente",
    };
  } catch (error) {
    console.error("Error en removeProductFromCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al remover producto",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Reordena un producto dentro de un grupo
 */
export async function reorderCatalogGroupProduct(
  catalogGroupProductId: string,
  newOrder: number
): Promise<AssignProductResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true, slug: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const assignment = await prisma.catalogGroupProduct.findUnique({
      where: { id: catalogGroupProductId },
      select: {
        catalogGroupId: true,
        order: true,
        catalogGroup: { select: { negocioId: true } },
      },
    });

    if (!assignment) {
      return { ok: false, message: "Asignación no encontrada" };
    }

    if (assignment.catalogGroup.negocioId !== usuario.negocio.id) {
      return {
        ok: false,
        message: "No tienes permiso para reordenar este producto",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const targetAssignment = await tx.catalogGroupProduct.findFirst({
        where: {
          catalogGroupId: assignment.catalogGroupId,
          order: newOrder,
          id: { not: catalogGroupProductId },
        },
        select: { id: true },
      });

      if (targetAssignment) {
        await tx.catalogGroupProduct.update({
          where: { id: targetAssignment.id },
          data: { order: assignment.order },
        });
      }

      return tx.catalogGroupProduct.update({
        where: { id: catalogGroupProductId },
        data: { order: newOrder },
      });
    });

    revalidateCatalogGroupCache(usuario.negocio.slug);

    return {
      ok: true,
      message: "Producto reordenado exitosamente",
      catalogGroupProduct: updated,
    };
  } catch (error) {
    console.error("Error en reorderCatalogGroupProduct:", error);
    return {
      ok: false,
      message: "Error al reordenar producto",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Alterna si un producto está destacado en un grupo
 */
export async function toggleCatalogGroupProductFeatured(
  catalogGroupProductId: string,
  isFeatured: boolean
): Promise<AssignProductResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true, slug: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const assignment = await prisma.catalogGroupProduct.findUnique({
      where: { id: catalogGroupProductId },
      select: {
        catalogGroup: { select: { negocioId: true } },
      },
    });

    if (!assignment) {
      return { ok: false, message: "Asignación no encontrada" };
    }

    if (assignment.catalogGroup.negocioId !== usuario.negocio.id) {
      return {
        ok: false,
        message: "No tienes permiso para cambiar este producto",
      };
    }

    const updated = await prisma.catalogGroupProduct.update({
      where: { id: catalogGroupProductId },
      data: { isFeatured },
    });

    revalidateCatalogGroupCache(usuario.negocio.slug);

    return {
      ok: true,
      message: `Producto ${isFeatured ? "destacado" : "sin destacar"} exitosamente`,
      catalogGroupProduct: updated,
    };
  } catch (error) {
    console.error("Error en toggleCatalogGroupProductFeatured:", error);
    return {
      ok: false,
      message: "Error al cambiar destacado del producto",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
