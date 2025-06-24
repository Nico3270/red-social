"use server";

import prisma from "@/lib/prisma";

interface UpdateOrderInput {
  productsInOrder: { id: string; cantidad: number }[];
  newProducts: { id: string | null; cantidad: number; precio?: number; comentario?: string }[];
  removedProductIds: string[]; // IDs de productos eliminados
}

export const updateOrder = async (orderId: string, data: UpdateOrderInput) => {
  try {
    const { productsInOrder, newProducts, removedProductIds } = data;

    // Eliminar productos que ya no están en la orden
    if (removedProductIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: {
          id: {
            in: removedProductIds,
          },
        },
      });
    }

    // Verificar la existencia de los registros antes de actualizarlos
    for (const item of productsInOrder) {
      const exists = await prisma.orderItem.findUnique({
        where: { id: item.id },
      });

      if (exists) {
        // Actualizar la cantidad solo si el registro existe
        await prisma.orderItem.update({
          where: { id: item.id },
          data: { cantidad: item.cantidad },
        });
      }
    }

    // Separar productos personalizados de productos existentes
    const customProducts = newProducts.filter((p) => p.id === null);
    const existingProducts = newProducts.filter((p) => p.id !== null);

    // Obtener precios de los productos existentes desde la base de datos
    const productPrices = existingProducts.length
      ? await prisma.product.findMany({
          where: {
            id: { in: existingProducts.map((p) => p.id as string) },
          },
          select: {
            id: true,
            precio: true,
          },
        })
      : [];

    // Preparar datos para insertar productos existentes
    const existingOrderItems = existingProducts.map((product) => {
      const priceInfo = productPrices.find((p) => p.id === product.id);
      return {
        cantidad: product.cantidad,
        orderId,
        productId: product.id as string,
        precio: priceInfo?.precio || 0, // Precio obtenido de la base de datos
        comentario: product.comentario || null,
      };
    });

    // Insertar productos existentes usando createMany
    if (existingOrderItems.length > 0) {
      await prisma.orderItem.createMany({
        data: existingOrderItems,
      });
    }

    // Insertar productos personalizados usando create (sin incluir productId)
    await Promise.all(
      customProducts.map((product) =>
        prisma.orderItem.create({
          data: {
            cantidad: product.cantidad,
            orderId,
            precio: product.precio || 0, // Usar el precio proporcionado
            comentario: product.comentario || "Producto personalizado",
          },
        })
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar la orden:", error);
    return { success: false, error: "Error al actualizar la orden" };
  }
};
