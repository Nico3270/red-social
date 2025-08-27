"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { OrderState } from '@prisma/client'; // Importa el enum OrderState

interface ItemInput {
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  productId?: string;
}

interface DeliveryDataInput {
  country?: string;
  departamento: string;
  ciudad: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  additionalComments?: string;
}

interface UpdatePedidoInput {
  orderId: string;
  items: ItemInput[];
  deliveryData: DeliveryDataInput;
  totalAmount: number;
  status?: OrderState; // Agregado: status opcional
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

    // Parsear deliveryDate a Date
    const deliveryDate = new Date(input.deliveryData.deliveryDate);

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

      const datosPedido = input.items
        .map((item) => `${item.quantity} - ${item.description}`)
        .join(", ");

      // Valor total ya lo tienes en input.totalAmount
      const valorCompra = `$${input.totalAmount.toFixed(2)}`;
      const nombreCliente = input.deliveryData.clientName;
      const direccionCliente = input.deliveryData.deliveryAddress || ""

      // Actualizar DeliveryData
      await tx.deliveryData.update({
        where: { id: existingOrder.deliveryDataId },
        data: {
          country: input.deliveryData.country || "Colombia",
          departamento: input.deliveryData.departamento,
          ciudad: input.deliveryData.ciudad,
          clientName: input.deliveryData.clientName,
          clientPhone: input.deliveryData.clientPhone,
          deliveryAddress: input.deliveryData.deliveryAddress,
          deliveryDate: deliveryDate,
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
          status: input.status ?? existingOrder.status, // Usa el nuevo status si se proporciona, de lo contrario mantiene el existente
        },
      });

      if (input.status && input.status === "Cancelada") {
        // Vamos a enviar una notificación de Cancelada
        if (session?.user.role === "negocio") {
          const notificacionUsuario = await notifyReservaConfirmadaCliente(
            {
              to: "+573182293083",
              template: PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO,
              datos_pedido: datosPedido,
              valor_compra: valorCompra,
              nombre_cliente: nombreCliente,
              direccion: direccionCliente,
              negocioId: negocioId || "", // Incluye negocioId para contexto
            }
          )
          if (!notificacionUsuario.ok) {
            console.warn('Notificación WhatsApp fallida, pero reserva creada: error en plantilla pedido cancelado negocio usuario');
            // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
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

      // Opcional: Crear historial de actualización
      await tx.orderStatusHistory.create({
        data: {
          orderId: input.orderId,
          previousState: existingOrder.status,
          newState: input.status ?? existingOrder.status, // Usa el nuevo status si se proporciona
          comment: "Orden actualizada",
        },
      });

      return { ok: true, message: "Orden actualizada exitosamente." };
    });
  } catch (error) {
    console.error("Error al actualizar la orden:", error);
    return { ok: false, message: "Error al actualizar la orden." };
  }
};