"use server";

import prisma from "@/lib/prisma";

export const getInformationByIdUpdateOrder = async (id: string) => {
  try {
    // Obtener información de la orden
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: true, // Información del producto
          },
        },
      },
    });
    
    if (!order) {
      return { success: false, error: "No se pudo encontrar la orden con el ID proporcionado." };
    }
    

    // Obtener el catálogo de productos
    const catalogProducts = await prisma.product.findMany();

    // Mapear los productos existentes en la orden
    const existingProducts = order.items.map((item) => ({
      id: item.id,
      nombre: item.producto?.nombre || "Producto desconocido",
      precio: item.producto?.precio || 0,
      cantidad: item.cantidad,
      comentario: item.comentario || "", // Asegúrate de que nunca sea null
    }));

    // Mapear el catálogo de productos
    const catalog = catalogProducts.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      cantidad: 1, // Cantidad inicial para agregar al pedido
    }));

    return {
      success: true,
      orderId: order.id,
      existingProducts: existingProducts,
      catalog: catalog,
    };
  } catch (error) {
    console.error("Error al obtener información para la actualización de la orden:", error);
    return { success: false, error: "Ocurrió un error inesperado al obtener la información." };
  }
};
