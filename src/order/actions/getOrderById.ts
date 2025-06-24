"use server";

import prisma from "@/lib/prisma";
import { Order, StatusHistory } from "../interfaces/types";
import { OrderState } from "@prisma/client"; // Importa correctamente el enum

export const getOrderById = async (id: string): Promise<{
  success: boolean;
  order?: Order;
  statusHistory?: StatusHistory[];
  error?: string;
}> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        datosDeEntrega: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Orden no encontrada" };
    }

    // Transformar los datos
    const formattedOrder: Order = {
      id: order.id,
      estado: order.estado as OrderState,
      createdAt: order.createdAt.toISOString(),
      datosDeEntrega: order.datosDeEntrega
        ? {
            deliveryAddress: order.datosDeEntrega.deliveryAddress,
            senderName: order.datosDeEntrega.senderName,
            senderPhone: order.datosDeEntrega.senderPhone,
            recipientName: order.datosDeEntrega.recipientName || null,
            recipientPhone: order.datosDeEntrega.recipientPhone,
            additionalComments: order.datosDeEntrega.additionalComments || null,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
        comentario: item.comentario || null,
        orderId: item.orderId,
        producto: item.producto
          ? {
              id: item.producto.id,
              createdAt: item.producto.createdAt.toISOString(),
              updatedAt: item.producto.updatedAt.toISOString(),
              precio: item.producto.precio,
              nombre: item.producto.nombre,
              descripcion: item.producto.descripcion,
              descripcionCorta: item.producto.descripcionCorta || null,
              slug: item.producto.slug,
              prioridad: item.producto.prioridad || null,
              status: item.producto.status,
              tags: item.producto.tags,
            }
          : null,
      })),
    };

    const formattedStatusHistory: StatusHistory[] = order.statusHistory.map((history) => ({
      id: history.id,
      createdAt: history.createdAt.toISOString(),
      previousState: history.previousState || "N/A",
      newState: history.newState,
      comment: history.comment || null,
      orderId: history.orderId,
    }));

    return {
      success: true,
      order: formattedOrder,
      statusHistory: formattedStatusHistory,
    };
  } catch (error) {
    console.error("Error al obtener la orden:", error);
    return { success: false, error: "Error al obtener la orden" };
  }
};
