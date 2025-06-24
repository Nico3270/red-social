"use server";

import prisma from "@/lib/prisma";

export async function discontinueProduct(productId: string) {
  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { status: "discontinued" },
    });

    return {
      ok: true,
      message: `El producto "${product.nombre}" ha sido marcado como descontinuado.`,
    };
  } catch (error) {
    console.error("Error al descontinuar el producto:", error);
    return {
      ok: false,
      message: "Ocurrió un error al descontinuar el producto.",
    };
  }
}
