"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  AssignProductToCatalogGroupInput,
  AssignProductResponse,
} from "@/interfaces/catalogGroup.interface";

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
      select: { negocio: { select: { id: true } } },
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
      select: { negocio: { select: { id: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    // Verificar que la asignación pertenece al negocio
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
        message: "No tienes permiso para remover este producto",
      };
    }

    // Eliminar la asignación
    await prisma.catalogGroupProduct.delete({
      where: { id: catalogGroupProductId },
    });

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
      select: { negocio: { select: { id: true } } },
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
        message: "No tienes permiso para reordenar este producto",
      };
    }

    const updated = await prisma.catalogGroupProduct.update({
      where: { id: catalogGroupProductId },
      data: { order: newOrder },
    });

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
      select: { negocio: { select: { id: true } } },
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
