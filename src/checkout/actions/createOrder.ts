"use server";

import prisma from "@/lib/prisma";
import { Prisma, OrderState } from "@prisma/client"; // Importamos los tipos de Prisma

interface CreateOrderInput {
  cartItems: {
    productId: string;
    cantidad: number;
    precio: number;
    comentario?: string;
  }[];
  address: {
    senderName: string;
    senderPhone: string;
    recipientName?: string;
    recipientPhone: string;
    deliveryAddress: string;
    occasion?: string;
    dedicationMessage?: string;
    deliveryDate?: string;
    deliveryTime?: string;
    additionalComments?: string;
  };
}

export const createOrder = async (data: CreateOrderInput) => {
  try {
    const { cartItems, address } = data;

    // console.log("Datos recibidos para crear orden:", { cartItems, address }); // Log para depurar

    const createdOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const deliveryData = await tx.deliveryData.create({
        data: {
          senderName: address.senderName,
          senderPhone: address.senderPhone,
          recipientName: address.recipientName || null,
          recipientPhone: address.recipientPhone,
          deliveryAddress: address.deliveryAddress,
          occasion: address.occasion || null,
          dedicationMessage: address.dedicationMessage || null,
          deliveryDate: address.deliveryDate ? new Date(address.deliveryDate) : null,
          deliveryTime: address.deliveryTime || null,
          additionalComments: address.additionalComments || null,
        },
      });

      // console.log("Datos de entrega creados:", deliveryData); // Log para confirmar

      const order = await tx.order.create({
        data: {
          estado: OrderState.RECIBIDA,
          datosDeEntrega: {
            connect: { id: deliveryData.id },
          },
          items: {
            create: cartItems.map((item) => ({
              cantidad: item.cantidad,
              precio: item.precio,
              comentario: item.comentario || null,
              producto: {
                connect: { id: item.productId },
              },
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // console.log("Orden creada:", order); // Log para confirmar

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousState: null,
          newState: OrderState.RECIBIDA,
          comment: "Orden creada y marcada como recibida automáticamente.",
        },
      });

      return order;
    });

    return { success: true, order: createdOrder };
  } catch (error) {
    console.error("Error al crear la orden:", error);
    return { success: false, error: "Error al crear la orden." };
  }
};
