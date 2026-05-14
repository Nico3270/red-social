"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import type { ProductStatus } from "@prisma/client";

export type PreviewAdminDeleteProductActionInput = {
  businessId: string;
  expectedSlug: string;
  productId: string;
};

export type PreviewAdminDeleteProductActionResult =
  | {
      ok: true;
      product: {
        id: string;
        nombre: string;
        slug: string;
        status: ProductStatus;
      };
      impact: {
        orderItemCount: number;
        variantCount: number;
        imageCount: number;
        sectionRelationCount: number;
        catalogGroupRelationCount: number;
        publicationLinkCount: number;
        generationCount: number;
      };
      blockers: string[];
      warnings: string[];
      recommendedAction: "delete_allowed" | "hide_or_discontinue" | "blocked";
    }
  | {
      ok: false;
      error: string;
    };

const LOG_PREFIX = "[previewAdminDeleteProductAction]";

function buildTraceId() {
  return `preview-admin-delete-product-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function previewAdminDeleteProductAction(
  rawInput: PreviewAdminDeleteProductActionInput,
): Promise<PreviewAdminDeleteProductActionResult> {
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
        error: "No tienes permisos para consultar este preview.",
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

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        status: true,
        negocioId: true,
      },
    });

    if (!product) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "product_not_found",
        actorUserId: session.user.id,
        productId,
      });
      return {
        ok: false,
        error: "No se encontró el producto especificado.",
      };
    }

    if (product.negocioId !== businessId) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "product_business_mismatch",
        actorUserId: session.user.id,
        businessId,
        productId,
      });
      return {
        ok: false,
        error: "El producto no pertenece al negocio especificado.",
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
      prisma.orderItem.count({
        where: {
          OR: [
            {
              productId: product.id,
            },
            {
              productVariant: {
                productId: product.id,
              },
            },
          ],
        },
      }),
      prisma.productVariant.count({
        where: {
          productId: product.id,
        },
      }),
      prisma.image.count({
        where: {
          productId: product.id,
        },
      }),
      prisma.productSection.count({
        where: {
          productId: product.id,
        },
      }),
      prisma.catalogGroupProduct.count({
        where: {
          productId: product.id,
        },
      }),
      prisma.publicacionProducto.count({
        where: {
          productoId: product.id,
        },
      }),
      prisma.productImageGeneration.count({
        where: {
          productId: product.id,
        },
      }),
    ]);

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (orderItemCount > 0) {
      blockers.push(
        "El producto tiene pedidos asociados. No se recomienda eliminarlo porque puede afectar el historial.",
      );
    }

    if (imageCount > 0) {
      warnings.push("El producto tiene imágenes asociadas.");
    }

    if (variantCount > 0) {
      warnings.push("El producto tiene variantes.");
    }

    if (sectionRelationCount > 0) {
      warnings.push("El producto está vinculado a secciones.");
    }

    if (catalogGroupRelationCount > 0) {
      warnings.push("El producto pertenece a grupos de catálogo.");
    }

    if (publicationLinkCount > 0) {
      warnings.push("El producto aparece en publicaciones.");
    }

    if (generationCount > 0) {
      warnings.push("El producto tiene generaciones de imagen asociadas.");
    }

    const recommendedAction =
      blockers.length > 0
        ? "blocked"
        : warnings.length > 0
          ? "hide_or_discontinue"
          : "delete_allowed";

    console.info(`${LOG_PREFIX}[${traceId}] Resultado`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
      impact: {
        orderItemCount,
        variantCount,
        imageCount,
        sectionRelationCount,
        catalogGroupRelationCount,
        publicationLinkCount,
        generationCount,
      },
      blockersCount: blockers.length,
      warningsCount: warnings.length,
      recommendedAction,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      product: {
        id: product.id,
        nombre: product.nombre,
        slug: product.slug,
        status: product.status,
      },
      impact: {
        orderItemCount,
        variantCount,
        imageCount,
        sectionRelationCount,
        catalogGroupRelationCount,
        publicationLinkCount,
        generationCount,
      },
      blockers,
      warnings,
      recommendedAction,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      elapsedMs: Date.now() - startedAt,
      error,
    });

    return {
      ok: false,
      error: "Ocurrió un error inesperado al generar el preview de eliminación.",
    };
  }
}