"use server"

import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";

interface ChangeStatusProduct {
  ok: boolean;
  message?: string;
}

export const changeStatusProduct = async (id: string, status: ProductStatus): Promise<ChangeStatusProduct> => {
  console.log("Iniciando changeStatusProduct con id:", id, "y status:", status);

  try {
    if (!id || !status) {
      return { ok: false, message: "El ID del producto y el estado son obligatorios." };
    }

    if (!Object.values(ProductStatus).includes(status)) {
      return { ok: false, message: "Estado del producto no es válido." };
    }

    await prisma.product.update({
      where: { id },
      data: { status },
    });

    return { ok: true, message: "Estado del producto actualizado correctamente." };

  } catch (error: unknown) {
    console.error("Error en changeStatusProduct:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Error inesperado al cambiar estado del producto.",
    };
  }
};
