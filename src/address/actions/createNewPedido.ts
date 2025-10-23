"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { TipoUsuario } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface ItemInput {
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  productId?: string;
}

interface DeliveryDataInput {
  orderType: "DELIVERY" | "ON_SITE";
  country?: string;
  departamento?: string;
  ciudad?: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress?: string;
  onSiteLocation?: string;
  deliveryDate?: string;
  additionalComments?: string;
}

interface PedidoInput {
  slug?: string;
  items: ItemInput[];
  deliveryData: DeliveryDataInput;
  totalAmount: number;
}

export const createNewPedido = async (input: PedidoInput): Promise<{
  ok: boolean;
  message: string;
}> => {
  try {
    const session = await auth();
    let negocioId = "";
    let tipoUsuario: TipoUsuario = TipoUsuario.negocio;
    let telefonoNegocio = "";

    // Validar negocioId basado en slug o sesión
    if (input.slug) {
      // Caso: usuario crea la orden
      const negocio = await prisma.negocio.findUnique({
        where: { slug: input.slug },
        select: { id: true, telefonoContacto: true },
      });

      if (!negocio) {
        return { ok: false, message: "Negocio no encontrado." };
      }

      negocioId = negocio.id;
      tipoUsuario = TipoUsuario.usuario;
      telefonoNegocio = negocio.telefonoContacto || "+573132390868"; // Número por defecto si no hay contacto
      
    } else {
      // Caso: negocio crea la orden (desde sesión)
      negocioId = session?.user.negocioId || "";
      tipoUsuario = TipoUsuario.negocio;

      if (!negocioId) {
        return { ok: false, message: "No se encontró el negocio en la sesión." };
      }
    }

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
      // Crear DeliveryData
      const newDeliveryData = await tx.deliveryData.create({
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

      // Crear Order (usar Decimal para totalAmount)
      const newOrder = await tx.order.create({
        data: {
          type: "ingreso",
          description: generatedDescription,
          totalAmount: new Decimal(input.totalAmount.toFixed(2)), // Limitar a 2 decimales
          category: "ventas",
          status: "Recibida",
          TipoUsuario: tipoUsuario,
          negocioId,
          deliveryDataId: newDeliveryData.id,
          orderType, // Nuevo campo,
        },
      });

      // Crear OrderItems (usar Decimal para price y subtotal)
      await tx.orderItem.createMany({
        data: input.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: new Decimal(item.price.toFixed(2)), // Limitar a 2 decimales
          subtotal: new Decimal(item.subtotal.toFixed(2)), // Limitar a 2 decimales
          orderId: newOrder.id,
          productId: item.productId || null,
        })),
      });

      // Crear historial inicial de status
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          previousState: null,
          newState: "Recibida",
          comment: `Pedido ${orderType === "DELIVERY" ? "a domicilio" : "en sitio"} creado`,
        },
      });

      // Construir el string de los productos
      const datosPedido = input.items
        .map((item) => `${item.quantity} - ${item.description}`)
        .join(", ");

      const valorCompra = `$${input.totalAmount.toFixed(2)}`;
      const nombreCliente = clientName;
      const telefonoCliente = clientPhone;
      const descripcionCompra = input.deliveryData.additionalComments || "";
      let direccionCompra = orderType === "DELIVERY" ? deliveryAddress || "" : onSiteLocation || "";
      const ciudadCompra = orderType === "DELIVERY" ? ciudad || "" : "";

      if (orderType === "ON_SITE") {
        direccionCompra = `Pedido en sitio: ${onSiteLocation}`;}

      // Notificaciones según el rol del usuario
      if (session?.user.role === "negocio") {
        const notificacionUsuario = await notifyReservaConfirmadaCliente({
          to: telefonoCliente, // Ajustar según configuración
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO,
          datos_pedido: sanitizeParam(datosPedido),
          valor_compra: sanitizeParam(valorCompra),
          nombre_cliente: sanitizeParam(nombreCliente),
          direccion: sanitizeParam(direccionCompra),
          negocioId,
        });
        if (!notificacionUsuario.ok) {
          console.warn("Notificación WhatsApp fallida, pero pedido creado: error en plantilla PEDIDO_CREADO_NEGOCIO_USUARIO");
        }
      }

      if (session?.user.role !== "negocio" || !session.user) {
        const notificacionNegocio = await notifyReservaConfirmadaCliente({
          to: telefonoNegocio, // Ajustar según configuración
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
          datos_pedido: sanitizeParam(datosPedido),
          valor_compra: sanitizeParam(valorCompra),
          nombre_cliente: sanitizeParam(nombreCliente),
          telefono_cliente: sanitizeParam(telefonoCliente),
          direccion: sanitizeParam(direccionCompra),
          descripcion: sanitizeParam(descripcionCompra),
          negocioId,
        });
        if (!notificacionNegocio.ok) {
          console.warn("Notificación WhatsApp al negocio fallida, pero pedido creado:", notificacionNegocio.message);
        }

        const notificacionUsuario = await notifyReservaConfirmadaCliente({
          to: telefonoCliente, // Ajustar según configuración
          template: PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
          datos_pedido: sanitizeParam(datosPedido),
          valor_compra: sanitizeParam(valorCompra),
          nombre_cliente: sanitizeParam(nombreCliente),
          direccion: sanitizeParam(direccionCompra),
          ciudad: sanitizeParam(ciudadCompra) || "Compra en sitio",
          negocioId,
        });
        if (!notificacionUsuario.ok) {
          console.warn("Notificación WhatsApp al usuario fallida, pero pedido creado:", notificacionUsuario.message);
        }
      }

      return { ok: true, message: "Pedido creado exitosamente." };
    });
  } catch (error) {
    console.error("Error al crear el pedido:", error);
    return { ok: false, message: `Error al crear el pedido: ${error instanceof Error ? error.message : "Error desconocido"}` };
  }
};

function sanitizeParam(text: string): string {
  if (!text) return "";
  return text
    .replace(/\n|\r|\t/g, " ")
    .replace(/ {5,}/g, " ")
    .trim();
}