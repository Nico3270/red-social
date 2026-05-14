"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export type DeleteAdminProductActionInput = {
  businessId: string;
  expectedSlug: string;
  productId: string;
};

export type DeleteAdminProductActionResult =
  | {
      ok: true;
      message: string;
      deletedProduct: {
        id: string;
        nombre: string;
        slug: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

type ImpactSnapshot = {
  orderItemCount: number;
  variantCount: number;
  imageCount: number;
  sectionRelationCount: number;
  catalogGroupRelationCount: number;
  publicationLinkCount: number;
  generationCount: number;
};

const LOG_PREFIX = "[deleteAdminProductAction]";
const RELATION_BLOCK_MESSAGE =
  "No se puede eliminar este producto porque aún tiene relaciones. Ocúltalo o descontinúalo en su lugar.";

function buildTraceId() {
  return `delete-admin-product-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDeleteAllowed(impact: ImpactSnapshot) {
  return (
    impact.orderItemCount === 0 &&
    impact.variantCount === 0 &&
    impact.imageCount === 0 &&
    impact.sectionRelationCount === 0 &&
    impact.catalogGroupRelationCount === 0 &&
    impact.publicationLinkCount === 0 &&
    impact.generationCount === 0
  );
}

export async function deleteAdminProductAction(
  rawInput: DeleteAdminProductActionInput,
): Promise<DeleteAdminProductActionResult> {
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
        error: "No tienes permisos para eliminar este producto.",
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

      const [
        orderItemCount,
        variantCount,
        imageCount,
        sectionRelationCount,
        catalogGroupRelationCount,
        publicationLinkCount,
        generationCount,
      ] = await Promise.all([
        tx.orderItem.count({
          where: {
            OR: [
              {
                productId: existingProduct.id,
              },
              {
                productVariant: {
                  productId: existingProduct.id,
                },
              },
            ],
          },
        }),
        tx.productVariant.count({
          where: {
            productId: existingProduct.id,
          },
        }),
        tx.image.count({
          where: {
            productId: existingProduct.id,
          },
        }),
        tx.productSection.count({
          where: {
            productId: existingProduct.id,
          },
        }),
        tx.catalogGroupProduct.count({
          where: {
            productId: existingProduct.id,
          },
        }),
        tx.publicacionProducto.count({
          where: {
            productoId: existingProduct.id,
          },
        }),
        tx.productImageGeneration.count({
          where: {
            productId: existingProduct.id,
          },
        }),
      ]);

      const impact: ImpactSnapshot = {
        orderItemCount,
        variantCount,
        imageCount,
        sectionRelationCount,
        catalogGroupRelationCount,
        publicationLinkCount,
        generationCount,
      };

      if (!isDeleteAllowed(impact)) {
        return {
          ok: false as const,
          error: RELATION_BLOCK_MESSAGE,
          reason: "impact_blocked" as const,
          impact,
        };
      }

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

      return {
        ok: true as const,
        deletedProduct,
        impact,
      };
    });

    console.info(`${LOG_PREFIX}[${traceId}] Impacto calculado`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
      impact:
        transactionResult.ok === true
          ? transactionResult.impact
          : transactionResult.reason === "impact_blocked"
            ? transactionResult.impact
            : null,
    });

    if (!transactionResult.ok) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: transactionResult.reason,
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        productId,
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
      message: "Producto eliminado correctamente.",
      deletedProduct: {
        id: transactionResult.deletedProduct.id,
        nombre: transactionResult.deletedProduct.nombre,
        slug: transactionResult.deletedProduct.slug,
      },
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      elapsedMs: Date.now() - startedAt,
      error,
    });

    return {
      ok: false,
      error: "Ocurrio un error inesperado al eliminar el producto.",
    };
  }
}
