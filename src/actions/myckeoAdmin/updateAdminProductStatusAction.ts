"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

export type UpdateAdminProductStatusActionInput = {
  businessId: string;
  expectedSlug: string;
  productId: string;
  status: ProductStatus;
};

export type UpdateAdminProductStatusActionResult =
  | {
      ok: true;
      product: {
        id: string;
        nombre: string;
        slug: string;
        status: ProductStatus;
      };
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

const LOG_PREFIX = "[updateAdminProductStatusAction]";

function buildTraceId() {
  return `update-admin-product-status-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  if (Object.values(ProductStatus).includes(value as ProductStatus)) {
    return value as ProductStatus;
  }

  return null;
}

export async function updateAdminProductStatusAction(
  rawInput: UpdateAdminProductStatusActionInput,
): Promise<UpdateAdminProductStatusActionResult> {
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
        error: "No tienes permisos para cambiar el estado de este producto.",
      };
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const productId = normalizeRequiredString(rawInput?.productId);
    const nextStatus = normalizeStatus(rawInput?.status);

    if (!businessId || !expectedSlug || !productId || !nextStatus) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "invalid_input",
        actorUserId: session.user.id,
      });

      return {
        ok: false,
        error: "Payload inválido. Debes enviar businessId, expectedSlug, productId y status válidos.",
      };
    }

    console.info(`${LOG_PREFIX}[${traceId}] Inicio`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
      nextStatus,
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

    const existingProduct = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        status: true,
        negocioId: true,
        precio: true,
        usaVariantes: true,
        imagenes: {
          select: {
            id: true,
          },
          take: 1,
        },
        variantes: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!existingProduct) {
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

    if (existingProduct.negocioId !== businessId) {
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

    if (nextStatus === ProductStatus.disponible) {
      const hasImage = existingProduct.imagenes.length > 0;
      const hasValidPrice = existingProduct.precio > 0;
      const hasActiveVariantsIfRequired =
        !existingProduct.usaVariantes || existingProduct.variantes.length > 0;

      if (!hasImage || !hasValidPrice || !hasActiveVariantsIfRequired) {
        console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
          reason: "invalid_available_transition",
          actorUserId: session.user.id,
          businessId,
          productId,
          hasImage,
          hasValidPrice,
          hasActiveVariantsIfRequired,
        });

        return {
          ok: false,
          error:
            "No puedes marcar como disponible un producto sin imagen, con precio inválido o sin variantes activas.",
        };
      }
    }

    const updatedProduct =
      existingProduct.status === nextStatus
        ? existingProduct
        : await prisma.product.update({
            where: {
              id: existingProduct.id,
            },
            data: {
              status: nextStatus,
            },
            select: {
              id: true,
              nombre: true,
              slug: true,
              status: true,
            },
          });

    revalidatePath(`/myckeoAdmin/productos/${expectedSlug}`);
    revalidatePath(`/myckeoAdmin/organizar/${expectedSlug}`);
    revalidatePath(`/perfil/${expectedSlug}`);
    revalidateTag(`negocio-catalog-${expectedSlug}`);

    if (updatedProduct.slug) {
      revalidatePath(`/producto/${updatedProduct.slug}`);
    }

    console.info(`${LOG_PREFIX}[${traceId}] Éxito`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      productId,
      nextStatus,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      product: {
        id: updatedProduct.id,
        nombre: updatedProduct.nombre,
        slug: updatedProduct.slug,
        status: updatedProduct.status,
      },
      message:
        existingProduct.status === nextStatus
          ? "El producto ya tenía ese estado."
          : "Estado de producto actualizado correctamente.",
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      elapsedMs: Date.now() - startedAt,
      error,
    });

    return {
      ok: false,
      error: "Ocurrió un error inesperado al actualizar el estado del producto.",
    };
  }
}