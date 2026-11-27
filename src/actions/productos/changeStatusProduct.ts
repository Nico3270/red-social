"use server";

import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";
import {
  productActor,
  privateProductScope,
  assertProductWriteBusiness,
  lockWritableBusiness,
} from "@/lib/business/productAccess";
import { revalidateAdminProductSurfaces } from "@/actions/myckeoAdmin/revalidateAdminProductSurfaces";

interface ChangeStatusProduct {
  ok: boolean;
  message?: string;
}

export const changeStatusProduct = async (
  id: string,
  status: ProductStatus,
): Promise<ChangeStatusProduct> => {
  try {
    if (!id || !status) {
      return {
        ok: false,
        message: "El ID del producto y el estado son obligatorios.",
      };
    }

    if (!Object.values(ProductStatus).includes(status)) {
      return { ok: false, message: "Estado del producto no es válido." };
    }

    const actor = await productActor();
    const product = await prisma.product.findFirst({
      where: { id, ...privateProductScope(actor) },
      select: {
        negocioId: true,
        slug: true,
        negocio: { select: { slug: true } },
      },
    });
    if (!product) return { ok: false, message: "Producto no disponible." };
    await assertProductWriteBusiness(product.negocioId, status);
    const changed = await prisma.$transaction(async (tx) => {
      await lockWritableBusiness(tx, product.negocioId, status);
      return tx.product.updateMany({
        where: {
          id,
          negocioId: product.negocioId,
          ...privateProductScope(actor),
          ...(status === "disponible"
            ? {
                negocio: {
                  is: {
                    ...(actor.role === "super_admin"
                      ? {}
                      : { usuarioId: actor.id }),
                    estado: "activo",
                    archivedAt: null,
                    isTestData: false,
                    usuario: {
                      is: {
                        estado: "activo",
                        isPlaceholder: false,
                        perfilCompleto: true,
                      },
                    },
                  },
                },
              }
            : {}),
        },
        data: { status },
      });
    });
    if (changed.count !== 1)
      return {
        ok: false,
        message: "El producto cambió. Recarga e intenta de nuevo.",
      };
    revalidateAdminProductSurfaces({
      businessSlug: product.negocio.slug,
      productSlug: product.slug,
      includeProductCount: true,
    });

    return {
      ok: true,
      message: "Estado del producto actualizado correctamente.",
    };
  } catch (error: unknown) {
    // console.error("Error en changeStatusProduct:", error);
    return {
      ok: false,
      message: "No fue posible cambiar el estado del producto.",
    };
  }
};
