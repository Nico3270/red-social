"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export type ForceDeleteAdminProductActionInput = {
  businessId: string;
  expectedSlug: string;
  productId: string;
};

export type ForceDeleteAdminProductActionResult =
  | {
      ok: true;
      message: string;
      deletedProduct: {
        id: string;
        nombre: string;
        slug: string;
      };
      cleanupSummary: {
        catalogGroupRelationsDeleted: number;
        sectionRelationsDeleted: number;
        attributesDeleted: number;
        publicationLinksDeleted: number;
        generationsDeleted: number;
        imagesDeleted: number;
        variantsDeleted: number;
        variantOptionsDeleted: number;
        cloudinaryCleanupPending: boolean;
        cloudinaryAssetEstimate: number;
      };
    }
  | {
      ok: false;
      error: string;
    };

const LOG_PREFIX = "[forceDeleteAdminProductAction]";
const ORDER_BLOCK_MESSAGE =
  "No se puede eliminar forzadamente este producto porque tiene pedidos asociados. Descontinúalo en su lugar.";

function buildTraceId() {
  return `force-delete-admin-product-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function forceDeleteAdminProductAction(
  rawInput: ForceDeleteAdminProductActionInput,
): Promise<ForceDeleteAdminProductActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "unauthenticated",
      });

      return {
        ok: false,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "forbidden_role",
        actorUserId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        error: "No tienes permisos para eliminar forzadamente este producto.",
      };
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const productId = normalizeRequiredString(rawInput?.productId);

    if (!businessId || !expectedSlug || !productId) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "invalid_input",
        actorUserId: session.user.id,
      });

      return {
        ok: false,
        error: "Payload inválido. Debes enviar businessId, expectedSlug y productId.",
      };
    }

    console.info(`${LOG_PREFIX}[${traceId}] Inicio`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
    });

    const business = await prisma.negocio.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!business) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "business_not_found",
        actorUserId: session.user.id,
        businessId,
      });

      return {
        ok: false,
        error: "No se encontró el negocio especificado.",
      };
    }

    if (business.slug !== expectedSlug) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "slug_mismatch",
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        resolvedSlug: business.slug,
      });

      return {
        ok: false,
        error: "El slug del negocio no coincide con el esperado.",
      };
    }

    let cloudinaryImageCount = 0;
    let generationWithCloudinaryCount = 0;

    try {
      cloudinaryImageCount = await prisma.image.count({
        where: {
          productId,
          url: {
            contains: "res.cloudinary.com",
            mode: "insensitive",
          },
        },
      });

      generationWithCloudinaryCount = await prisma.productImageGeneration.count({
        where: {
          productId,
          OR: [
            {
              cloudinaryPublicId: {
                not: null,
              },
            },
            {
              cloudinaryUrl: {
                contains: "res.cloudinary.com",
                mode: "insensitive",
              },
            },
          ],
        },
      });
    } catch (estimateError) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "cloudinary_estimate_failed",
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        productId,
        estimateError,
      });
    }

    const cloudinaryAssetEstimate =
      cloudinaryImageCount + generationWithCloudinaryCount;

    console.info(`${LOG_PREFIX}[${traceId}] Cloudinary estimate`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
      cloudinaryImageCount,
      generationWithCloudinaryCount,
      cloudinaryAssetEstimate,
    });

    console.info(`${LOG_PREFIX}[${traceId}] Tx iniciada`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
    });

    const transactionResult = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          negocioId: true,
        },
      });

      if (!existingProduct) {
        return {
          ok: false as const,
          error: "No se encontró el producto especificado.",
          reason: "product_not_found" as const,
        };
      }

      if (existingProduct.negocioId !== businessId) {
        return {
          ok: false as const,
          error: "El producto no pertenece al negocio especificado.",
          reason: "product_business_mismatch" as const,
        };
      }

      const productVariantIdsRows = await tx.productVariant.findMany({
        where: {
          productId: existingProduct.id,
        },
        select: {
          id: true,
        },
      });

      const variantIds = productVariantIdsRows.map((variant) => variant.id);

      const directOrderItemCount = await tx.orderItem.count({
        where: {
          productId: existingProduct.id,
        },
      });

      let indirectOrderItemCount = 0;

      if (variantIds.length > 0) {
        indirectOrderItemCount = await tx.orderItem.count({
          where: {
            productVariantId: {
              in: variantIds,
            },
          },
        });
      }

      const orderItemCount = directOrderItemCount + indirectOrderItemCount;

      console.info(`${LOG_PREFIX}[${traceId}] Conteo pedidos en tx`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        productId,
        directOrderItemCount,
        indirectOrderItemCount,
        orderItemCount,
      });

      if (orderItemCount > 0) {
        return {
          ok: false as const,
          error: ORDER_BLOCK_MESSAGE,
          reason: "blocked_by_orders" as const,
          orderItemCount,
        };
      }

      const catalogGroupDelete = await tx.catalogGroupProduct.deleteMany({
        where: {
          productId: existingProduct.id,
        },
      });

      const sectionDelete = await tx.productSection.deleteMany({
        where: {
          productId: existingProduct.id,
        },
      });

      const attributeDelete = await tx.productAttribute.deleteMany({
        where: {
          productId: existingProduct.id,
        },
      });

      const publicationDelete = await tx.publicacionProducto.deleteMany({
        where: {
          productoId: existingProduct.id,
        },
      });

      const generationDelete = await tx.productImageGeneration.deleteMany({
        where: {
          productId: existingProduct.id,
        },
      });

      const imageDelete = await tx.image.deleteMany({
        where: {
          productId: existingProduct.id,
        },
      });

      let variantOptionsDeleted = 0;

      if (variantIds.length > 0) {
        const variantOptionsDelete = await tx.productVariantOption.deleteMany({
          where: {
            variantId: {
              in: variantIds,
            },
          },
        });

        variantOptionsDeleted = variantOptionsDelete.count;
      }

      const variantDelete = await tx.productVariant.deleteMany({
        where: {
          productId: existingProduct.id,
        },
      });

      const deletedProduct = await tx.product.delete({
        where: {
          id: existingProduct.id,
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
        },
      });

      const cleanupSummary = {
        catalogGroupRelationsDeleted: catalogGroupDelete.count,
        sectionRelationsDeleted: sectionDelete.count,
        attributesDeleted: attributeDelete.count,
        publicationLinksDeleted: publicationDelete.count,
        generationsDeleted: generationDelete.count,
        imagesDeleted: imageDelete.count,
        variantsDeleted: variantDelete.count,
        variantOptionsDeleted: variantOptionsDeleted,
        cloudinaryCleanupPending: cloudinaryAssetEstimate > 0,
        cloudinaryAssetEstimate,
      };

      console.info(`${LOG_PREFIX}[${traceId}] deleteMany counts reales`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        productId,
        cleanupSummary,
      });

      return {
        ok: true as const,
        deletedProduct,
        orderItemCount,
        cleanupSummary,
      };
    }, { timeout: 15000 });

    if (!transactionResult.ok) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: transactionResult.reason,
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        productId,
        orderItemCount:
          transactionResult.reason === "blocked_by_orders"
            ? transactionResult.orderItemCount
            : undefined,
      });

      return {
        ok: false,
        error: transactionResult.error,
      };
    }

    revalidatePath(`/myckeoAdmin/productos/${expectedSlug}`);
    revalidatePath(`/myckeoAdmin/organizar/${expectedSlug}`);
    revalidatePath(`/perfil/${expectedSlug}`);
    revalidateTag(`negocio-catalog-${expectedSlug}`);

    if (transactionResult.deletedProduct.slug) {
      revalidatePath(`/producto/${transactionResult.deletedProduct.slug}`);
    }

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      message:
        "Producto eliminado forzadamente con limpieza de relaciones no históricas.",
      deletedProduct: transactionResult.deletedProduct,
      cleanupSummary: transactionResult.cleanupSummary,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      elapsedMs: Date.now() - startedAt,
      error,
    });

    return {
      ok: false,
      error: "Ocurrió un error inesperado al eliminar forzadamente el producto.",
    };
  }
}
