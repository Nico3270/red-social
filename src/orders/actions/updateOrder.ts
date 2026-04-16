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
  productVariantId?: string | null;
  variantLabel?: string | null;
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

function sanitizeParam(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\n|\r|\t/g, " ").replace(/ {5,}/g, " ").trim();
}

function getItemDisplayName(item: ItemInput): string {
  const base = sanitizeParam(item.description);
  const variant = sanitizeParam(item.variantLabel);

  return variant ? `${base} (${variant})` : base;
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

    // ============================
    // VALIDACIÓN ORDER TYPE
    // ============================
    const {
      orderType,
      clientName,
      clientPhone,
      deliveryAddress,
      onSiteLocation,
      ciudad,
      departamento,
      country
    } = input.deliveryData;

    if (orderType === "DELIVERY") {
      if (!country || !departamento || !ciudad || !deliveryAddress) {
        return {
          ok: false,
          message:
            "Faltan datos para entrega a domicilio: país, departamento, ciudad y dirección son obligatorios.",
        };
      }
    } else if (orderType === "ON_SITE") {
      if (!onSiteLocation) {
        return {
          ok: false,
          message: "La referencia de ubicación es requerida para pedidos en sitio.",
        };
      }
    } else {
      return { ok: false, message: "Tipo de pedido inválido." };
    }

    // Convertir deliveryDate
    const deliveryDate = input.deliveryData.deliveryDate
      ? new Date(input.deliveryData.deliveryDate)
      : null;

    if (deliveryDate && isNaN(deliveryDate.getTime())) {
      return { ok: false, message: "Fecha de entrega inválida." };
    }

    // ==============================================================
    // 🟩 TRANSACCIÓN — SOLO PRISMA
    // ==============================================================

    const {
      datosPedido,
      valorCompra,
      nombreCliente,
      direccionCliente
    } = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: input.orderId },
      });

      if (!existingOrder) {
        throw new Error("Orden no encontrada.");
      }

      if (existingOrder.negocioId !== negocioId) {
        throw new Error("No autorizado para actualizar esta orden.");
      }

      if (!existingOrder.deliveryDataId) {
        throw new Error("No hay datos de entrega asociados.");
      }

      // ============================
      // UPDATE DELIVERY DATA
      // ============================
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
          additionalComments: input.deliveryData.additionalComments || null
        },
      });

      const generatedDescription = input.items
        .map((item) => `${getItemDisplayName(item)} x${item.quantity}`)
        .join(", ");

      await tx.order.update({
        where: { id: input.orderId },
        data: {
          description: generatedDescription,
          totalAmount: input.totalAmount,
          status: input.status ?? existingOrder.status,
          orderType,
        },
      });

      // Delete old items
      await tx.orderItem.deleteMany({
        where: { orderId: input.orderId },
      });

      // Add new items
      await tx.orderItem.createMany({
        data: input.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          orderId: input.orderId,
          productId: item.productId || null,
          productVariantId: item.productVariantId || null,
          variantLabel: item.variantLabel || null,
        })),
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: input.orderId,
          previousState: existingOrder.status,
          newState: input.status ?? existingOrder.status,
          comment: `Orden actualizada (${orderType === "DELIVERY" ? "a domicilio" : "en sitio"})`,
        },
      });

      const datosPedido = input.items
        .map((item) => `${item.quantity} - ${getItemDisplayName(item)}`)
        .join(", ");

      const valorCompra = `$${input.totalAmount.toFixed(2)}`;
      const nombreCliente = clientName;
      const direccionCliente =
        orderType === "DELIVERY"
          ? deliveryAddress || ""
          : `Pedido en sitio: ${onSiteLocation}`;

      return {
        existingOrder,
        datosPedido,
        valorCompra,
        nombreCliente,
        direccionCliente
      };
    });

    // ==============================================================
    // 🟦 FUERA DE LA TRANSACCIÓN → NOTIFICACIONES
    // ==============================================================

    // Notificar si SE CANCELÓ la orden
    if (input.status === "Cancelada") {
      await notifyReservaConfirmadaCliente({
        to: clientPhone,
        template: PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO,
        datos_pedido: datosPedido,
        valor_compra: valorCompra,
        nombre_cliente: nombreCliente,
        direccion: direccionCliente,
        negocioId
      });
    }

    return { ok: true, message: "Orden actualizada exitosamente." };
  } catch (error) {
    console.error("Error al actualizar la orden:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Error al actualizar la orden: ${error.message}`
          : "Error desconocido",
    };
  }
};
