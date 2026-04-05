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

interface CreatePedidoResponse {
  ok: boolean;
  message: string;
}

const FALLBACK_COMENTARIOS_ADICIONALES = "Sin comentarios adicionales";
const FALLBACK_TELEFONO_NEGOCIO = "+573132390868";

export const createNewPedido = async (
  input: PedidoInput
): Promise<CreatePedidoResponse> => {
  try {
    const session = await auth();

    let negocioId = "";
    let tipoUsuario: TipoUsuario = TipoUsuario.negocio;
    let telefonoNegocio = "";
    const negocioSlug = session?.user.negocioSlug ?? "";

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { ok: false, message: "Debes agregar al menos un producto al pedido." };
    }

    if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0) {
      return { ok: false, message: "El valor total del pedido es inválido." };
    }

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
      telefonoNegocio = negocio.telefonoContacto || FALLBACK_TELEFONO_NEGOCIO;
    } else {
      negocioId = session?.user.negocioId || "";
      tipoUsuario = TipoUsuario.negocio;

      if (!negocioId) {
        return {
          ok: false,
          message: "No se encontró el negocio en la sesión.",
        };
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
      additionalComments,
    } = input.deliveryData;

    const sanitizedClientName = sanitizeParam(clientName);
    const sanitizedClientPhone = sanitizeParam(clientPhone);
    const sanitizedDeliveryAddress = sanitizeParam(deliveryAddress);
    const sanitizedOnSiteLocation = sanitizeParam(onSiteLocation);
    const sanitizedCiudad = sanitizeParam(ciudad);
    const sanitizedDepartamento = sanitizeParam(departamento);
    const sanitizedCountry = sanitizeParam(country) || "Colombia";
    const sanitizedAdditionalComments = sanitizeParam(additionalComments);

    if (!sanitizedClientName) {
      return { ok: false, message: "El nombre del cliente es obligatorio." };
    }

    if (!sanitizedClientPhone) {
      return { ok: false, message: "El teléfono del cliente es obligatorio." };
    }

    if (orderType === "DELIVERY") {
      if (
        !sanitizedCountry ||
        !sanitizedDepartamento ||
        !sanitizedCiudad ||
        !sanitizedDeliveryAddress
      ) {
        return {
          ok: false,
          message:
            "Faltan datos requeridos para entrega a domicilio: país, departamento, ciudad y dirección son obligatorios.",
        };
      }
    } else if (orderType === "ON_SITE") {
      if (!sanitizedOnSiteLocation) {
        return {
          ok: false,
          message: "La referencia de ubicación es requerida para pedidos en sitio.",
        };
      }
    } else {
      return { ok: false, message: "Tipo de pedido inválido." };
    }

    const deliveryDate = input.deliveryData.deliveryDate
      ? new Date(input.deliveryData.deliveryDate)
      : undefined;

    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) {
      return { ok: false, message: "Fecha de entrega inválida." };
    }

    // =======================================================
    // 🟩 TRANSACCIÓN — SOLO PRISMA
    // =======================================================
    const {
      datosPedido,
      valorCompra,
      nombreCliente,
      telefonoCliente,
      descripcionCompra,
      direccionCompra,
      ciudadCompra,
    } = await prisma.$transaction(async (tx) => {
      const newDeliveryData = await tx.deliveryData.create({
        data: {
          country: orderType === "DELIVERY" ? sanitizedCountry : null,
          departamento: orderType === "DELIVERY" ? sanitizedDepartamento : null,
          ciudad: orderType === "DELIVERY" ? sanitizedCiudad : null,
          clientName: sanitizedClientName,
          clientPhone: sanitizedClientPhone,
          deliveryAddress:
            orderType === "DELIVERY" ? sanitizedDeliveryAddress : null,
          onSiteLocation:
            orderType === "ON_SITE" ? sanitizedOnSiteLocation : null,
          deliveryDate,
          additionalComments: sanitizedAdditionalComments || null,
        },
      });

      const generatedDescription = input.items
        .map((item) => `${sanitizeParam(item.description)} x${item.quantity}`)
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
          description: sanitizeParam(item.description),
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
          comment: `Pedido ${
            orderType === "DELIVERY" ? "a domicilio" : "en sitio"
          } creado`,
        },
      });

      const datosPedido = input.items
        .map((item) => `${item.quantity} - ${sanitizeParam(item.description)}`)
        .join(", ");

      const valorCompra = `$${input.totalAmount.toFixed(2)}`;
      const nombreCliente = sanitizedClientName;
      const telefonoCliente = sanitizedClientPhone;
      const descripcionCompra = sanitizedAdditionalComments;

      let direccionCompra =
        orderType === "DELIVERY"
          ? sanitizedDeliveryAddress
          : sanitizedOnSiteLocation;

      const ciudadCompra = orderType === "DELIVERY" ? sanitizedCiudad : "";

      if (orderType === "ON_SITE") {
        direccionCompra = `Pedido en sitio: ${sanitizedOnSiteLocation}`;
      }

      return {
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
    // 🟦 NOTIFICACIONES FUERA DE LA TRANSACCIÓN
    // =======================================================

    const sanitizedDatosPedido = sanitizeParam(datosPedido);
    const sanitizedValorCompra = sanitizeParam(valorCompra);
    const sanitizedNombreCliente = sanitizeParam(nombreCliente);
    const sanitizedTelefonoCliente = sanitizeParam(telefonoCliente);
    const sanitizedDireccionCompra = sanitizeParam(direccionCompra);
    const sanitizedCiudadCompra = sanitizeParam(ciudadCompra);
    const sanitizedDescripcionCompraFinal = sanitizeParam(descripcionCompra);
    const descripcionParaNegocio =
      sanitizedDescripcionCompraFinal || FALLBACK_COMENTARIOS_ADICIONALES;

    let enviarANegocio = true;

    if (session?.user.role === "negocio") {
      if (input.slug) {
        if (input.slug === negocioSlug) {
          enviarANegocio = false;
        }
      } else {
        enviarANegocio = false;
      }
    } else if (!session?.user || session.user.role !== "negocio") {
      enviarANegocio = true;
    }

    if (enviarANegocio) {
      const notifyBusinessResult = await notifyReservaConfirmadaCliente({
        to: telefonoNegocio,
        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
        datos_pedido: sanitizedDatosPedido,
        valor_compra: sanitizedValorCompra,
        nombre_cliente: sanitizedNombreCliente,
        telefono_cliente: sanitizedTelefonoCliente,
        direccion: sanitizedDireccionCompra,
        descripcion: descripcionParaNegocio,
        negocioId,
      });

      logNotificationResult("negocio", notifyBusinessResult, {
        negocioId,
        telefonoDestino: telefonoNegocio,
        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
      });
    }

    if (session?.user.role === "negocio") {
      const notifyClientFromBusinessResult =
        await notifyReservaConfirmadaCliente({
          to: telefonoCliente,
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO,
          datos_pedido: sanitizedDatosPedido,
          valor_compra: sanitizedValorCompra,
          nombre_cliente: sanitizedNombreCliente,
          direccion: sanitizedDireccionCompra,
          negocioId,
        });

      logNotificationResult("cliente_desde_negocio", notifyClientFromBusinessResult, {
        negocioId,
        telefonoDestino: telefonoCliente,
        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO,
      });
    } else {
      const notifyClientResult = await notifyReservaConfirmadaCliente({
        to: telefonoCliente,
        template: PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
        datos_pedido: sanitizedDatosPedido,
        valor_compra: sanitizedValorCompra,
        nombre_cliente: sanitizedNombreCliente,
        direccion: sanitizedDireccionCompra,
        ciudad: sanitizedCiudadCompra,
        negocioId,
      });

      logNotificationResult("cliente", notifyClientResult, {
        negocioId,
        telefonoDestino: telefonoCliente,
        template: PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
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

function sanitizeParam(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\n|\r|\t/g, " ").replace(/ {2,}/g, " ").trim();
}

function logNotificationResult(
  label: string,
  result: { ok: boolean; errorMessage: string | null },
  context?: Record<string, unknown>
) {
  if (result.ok) return;

  console.warn(`Advertencia notificando ${label}:`, {
    errorMessage: result.errorMessage,
    ...context,
  });
}