"use server";

import prisma from "@/lib/prisma";
import { OrderState } from "@prisma/client"; // Importa el enum generado por Prisma

interface ChangeStatusOrderInput {
  orderId: string;
  newState: OrderState; // Cambia el tipo de string a OrderState
  comment?: string;
}

export const changeStatusOrder = async ({
  orderId,
  newState,
  comment,
}: ChangeStatusOrderInput) => {
  try {
    // Obtener la orden actual
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error("Orden no encontrada");

    // Crear un registro en el historial de estados
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        previousState: order.estado,
        newState,
        comment: comment || null,
      },
    });

    // Actualizar el estado de la orden
    await prisma.order.update({
      where: { id: orderId },
      data: { estado: newState },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al cambiar el estado de la orden:", error);
    return { success: false, error: error };
  }
};
