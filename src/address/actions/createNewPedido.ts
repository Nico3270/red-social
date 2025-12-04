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
    const negocioSlug = session?.user.negocioSlug; 

    // ============================
    // VALIDACIONES NEGOCIO
    // ============================
    if (input.slug) {
      const negocio = await prisma.negocio.findUnique({
        where: { slug: input.slug },
        select: { id: true, telefonoContacto: true },
      });

      if (!negocio) {
        return { ok: false, message: "Negocio no encontrado." };
      }

      negocioId = negocio.id;
      tipoUsuario = TipoUsuario.usuario;
      telefonoNegocio = negocio.telefonoContacto || "+573132390868";
    } else {
      negocioId = session?.user.negocioId || "";
      tipoUsuario = TipoUsuario.negocio;

      if (!negocioId) {
        return { ok: false, message: "No se encontró el negocio en la sesión." };
      }
    }

    const {
      orderType,
      clientName,
      clientPhone,
      deliveryAddress,
      onSiteLocation,
      ciudad,
      departamento,
      country,
    } = input.deliveryData;

    if (orderType === "DELIVERY") {
      if (!country || !departamento || !ciudad || !deliveryAddress) {
        return {
          ok: false,
          message:
            "Faltan datos requeridos para entrega a domicilio: país, departamento, ciudad y dirección son obligatorios.",
        };
      }
    } else if (orderType === "ON_SITE") {
      if (!onSiteLocation) {
        return {
          ok: false,
          message: "La referencia de ubicación es requerida para pedidos en sitio.",
        };
      }
    }

    const deliveryDate = input.deliveryData.deliveryDate
      ? new Date(input.deliveryData.deliveryDate)
      : undefined;

    if (deliveryDate && isNaN(deliveryDate.getTime())) {
      return { ok: false, message: "Fecha de entrega inválida." };
    }

    // =======================================================
    // 🟩 TRANSACCIÓN — SOLO PRISMA
    // =======================================================
    const {  datosPedido, valorCompra, nombreCliente, telefonoCliente, descripcionCompra, direccionCompra, ciudadCompra } =
      await prisma.$transaction(async (tx) => {
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

        const generatedDescription = input.items
          .map((item) => `${item.description} x${item.quantity}`)
          .join(", ");

        const newOrder = await tx.order.create({
          data: {
            type: "ingreso",
            description: generatedDescription,
            totalAmount: new Decimal(input.totalAmount.toFixed(2)),
            category: "ventas",
            status: "Recibida",
            TipoUsuario: tipoUsuario,
            negocioId,
            deliveryDataId: newDeliveryData.id,
            orderType,
          },
        });

        await tx.orderItem.createMany({
          data: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: new Decimal(item.price.toFixed(2)),
            subtotal: new Decimal(item.subtotal.toFixed(2)),
            orderId: newOrder.id,
            productId: item.productId || null,
          })),
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: newOrder.id,
            previousState: null,
            newState: "Recibida",
            comment: `Pedido ${orderType === "DELIVERY" ? "a domicilio" : "en sitio"} creado`,
          },
        });

        const datosPedido = input.items
          .map((item) => `${item.quantity} - ${item.description}`)
          .join(", ");

        const valorCompra = `$${input.totalAmount.toFixed(2)}`;
        const nombreCliente = clientName;
        const telefonoCliente = clientPhone;
        const descripcionCompra = input.deliveryData.additionalComments || "";
        let direccionCompra =
          orderType === "DELIVERY" ? deliveryAddress || "" : onSiteLocation || "";
        const ciudadCompra = orderType === "DELIVERY" ? ciudad || "" : "";

        if (orderType === "ON_SITE") {
          direccionCompra = `Pedido en sitio: ${onSiteLocation}`;
        }

        return {
          newOrder,
          datosPedido,
          valorCompra,
          nombreCliente,
          telefonoCliente,
          descripcionCompra,
          direccionCompra,
          ciudadCompra,
        };
      });

    // =======================================================
    // 🟦 AHORA SÍ — NOTIFICACIONES FUERA DE LA TRANSACCIÓN
    // =======================================================

    // Determinar si enviar notificación al negocio
    let enviarANegocio = true;

    if (session?.user.role === "negocio") {
      // Si hay input.slug (creando en otro negocio potencial)
      if (input.slug) {
        // No enviar si es el mismo negocio
        if (input.slug === negocioSlug) {
          enviarANegocio = false;
        }
      } else {
        // Si no hay slug, es su propio negocio, no enviar
        enviarANegocio = false;
      }
    } else if (!session?.user || session.user.role !== "negocio") {
      // Siempre enviar si no es negocio o no hay sesión
      enviarANegocio = true;
    }

    // Enviar al negocio si corresponde
    if (enviarANegocio) {
      await notifyReservaConfirmadaCliente({
        to: telefonoNegocio,
        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
        datos_pedido: sanitizeParam(datosPedido),
        valor_compra: sanitizeParam(valorCompra),
        nombre_cliente: sanitizeParam(nombreCliente),
        telefono_cliente: sanitizeParam(telefonoCliente),
        direccion: sanitizeParam(direccionCompra),
        descripcion: sanitizeParam(descripcionCompra),
        negocioId,
      });
    }

    // Enviar al cliente (adaptando plantilla según rol)
    if (session?.user.role === "negocio") {
      await notifyReservaConfirmadaCliente({
        to: telefonoCliente,
        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO,
        datos_pedido: sanitizeParam(datosPedido),
        valor_compra: sanitizeParam(valorCompra),
        nombre_cliente: sanitizeParam(nombreCliente),
        direccion: sanitizeParam(direccionCompra),
        negocioId,
      });
    } else {
      await notifyReservaConfirmadaCliente({
        to: telefonoCliente,
        template: PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
        datos_pedido: sanitizeParam(datosPedido),
        valor_compra: sanitizeParam(valorCompra),
        nombre_cliente: sanitizeParam(nombreCliente),
        direccion: sanitizeParam(direccionCompra),
        ciudad: sanitizeParam(ciudadCompra),
        negocioId,
      });
    }

    return { ok: true, message: "Pedido creado exitosamente." };
  } catch (error) {
    console.error("Error al crear el pedido:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Error al crear el pedido: ${error.message}`
          : "Error desconocido",
    };
  }
};

function sanitizeParam(text: string): string {
  if (!text) return "";
  return text.replace(/\n|\r|\t/g, " ").replace(/ {5,}/g, " ").trim();
}