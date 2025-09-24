"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { OrderState } from "@prisma/client";

interface ItemInput {
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  productId?: string;
}

interface DeliveryDataInput {
  orderType: "DELIVERY" | "ON_SITE";
  country?: string | null;
  departamento?: string | null;
  ciudad?: string | null;
  clientName: string;
  clientPhone: string;
  deliveryAddress?: string | null;
  onSiteLocation?: string | null;
  deliveryDate?: string | null;
  additionalComments?: string | null;
}

interface UpdatePedidoInput {
  orderId: string;
  items: ItemInput[];
  deliveryData: DeliveryDataInput;
  totalAmount: number;
  status?: OrderState;
}

export const updateOrder = async (input: UpdatePedidoInput): Promise<{
  ok: boolean;
  message: string;
}> => {
  try {
    const session = await auth();
    if (!session || !session.user.negocioId) {
      return { ok: false, message: "No autorizado." };
    }

    const negocioId = session.user.negocioId;

    // Validar campos requeridos según orderType
    const { orderType, clientName, clientPhone, deliveryAddress, onSiteLocation, ciudad, departamento, country } = input.deliveryData;
    if (orderType === "DELIVERY") {
      if (!country || !departamento || !ciudad || !deliveryAddress) {
        return { ok: false, message: "Faltan datos requeridos para entrega a domicilio: país, departamento, ciudad y dirección son obligatorios." };
      }
    } else if (orderType === "ON_SITE") {
      if (!onSiteLocation) {
        return { ok: false, message: "La referencia de ubicación es requerida para pedidos en sitio." };
      }
    } else {
      return { ok: false, message: "Tipo de pedido inválido." };
    }

    // Parsear deliveryDate a Date (si se proporciona)
    const deliveryDate = input.deliveryData.deliveryDate ? new Date(input.deliveryData.deliveryDate) : undefined;
    if (deliveryDate && isNaN(deliveryDate.getTime())) {
      return { ok: false, message: "Fecha de entrega inválida." };
    }

    return await prisma.$transaction(async (tx) => {
      // Verificar que la orden existe y pertenece al negocio
      const existingOrder = await tx.order.findUnique({
        where: { id: input.orderId },
      });

      if (!existingOrder) {
        return { ok: false, message: "Orden no encontrada." };
      }

      if (existingOrder.negocioId !== negocioId) {
        return { ok: false, message: "No autorizado para actualizar esta orden." };
      }

      if (!existingOrder.deliveryDataId) {
        return { ok: false, message: "No hay datos de entrega asociados." };
      }

      // Actualizar DeliveryData
      await tx.deliveryData.update({
        where: { id: existingOrder.deliveryDataId },
        data: {
          country: orderType === "DELIVERY" ? country || "Colombia" : null,
          departamento: orderType === "DELIVERY" ? departamento : null,
          ciudad: orderType === "DELIVERY" ? ciudad : null,
          clientName,
          clientPhone,
          deliveryAddress: orderType === "DELIVERY" ? deliveryAddress : null,
          onSiteLocation: orderType === "ON_SITE" ? onSiteLocation : null,
          deliveryDate,
          additionalComments: input.deliveryData.additionalComments,
        },
      });

      // Generar descripción auto de items
      const generatedDescription = input.items
        .map((item) => `${item.description} x${item.quantity}`)
        .join(", ");

      // Actualizar Order
      await tx.order.update({
        where: { id: input.orderId },
        data: {
          description: generatedDescription,
          totalAmount: input.totalAmount,
          status: input.status ?? existingOrder.status,
          orderType, // Update orderType
        },
      });

      // Notificaciones para cancelación
      if (input.status && input.status === "Cancelada") {
        const datosPedido = input.items
          .map((item) => `${item.quantity} - ${item.description}`)
          .join(", ");
        const valorCompra = `$${input.totalAmount.toFixed(2)}`;
        const nombreCliente = input.deliveryData.clientName;
        const direccionCliente = orderType === "DELIVERY" ? input.deliveryData.deliveryAddress || "" : input.deliveryData.onSiteLocation || "";

        if (session?.user.role === "negocio") {
          const notificacionUsuario = await notifyReservaConfirmadaCliente({
            to: "+573182293083", // Adjust as needed
            template: PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO,
            datos_pedido: datosPedido,
            valor_compra: valorCompra,
            nombre_cliente: nombreCliente,
            direccion: direccionCliente,
            negocioId: negocioId || "",
          });
          if (!notificacionUsuario.ok) {
            console.warn("Notificación WhatsApp fallida, pero orden actualizada: error en plantilla PEDIDO_CANCELADO_NEGOCIO");
          }
        }
      }

      // Eliminar OrderItems existentes
      await tx.orderItem.deleteMany({
        where: { orderId: input.orderId },
      });

      // Crear nuevos OrderItems
      await tx.orderItem.createMany({
        data: input.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          orderId: input.orderId,
          productId: item.productId || null,
        })),
      });

      // Crear historial de actualización
      await tx.orderStatusHistory.create({
        data: {
          orderId: input.orderId,
          previousState: existingOrder.status,
          newState: input.status ?? existingOrder.status,
          comment: `Orden actualizada (${orderType === "DELIVERY" ? "a domicilio" : "en sitio"})`,
        },
      });

      return { ok: true, message: "Orden actualizada exitosamente." };
    });
  } catch (error) {
    console.error("Error al actualizar la orden:", error);
    return { ok: false, message: `Error al actualizar la orden: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
};