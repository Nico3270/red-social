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

interface ActionResult {
  ok: boolean;
  message: string;
}

interface NotifyResultLike {
  ok?: boolean;
  free?: boolean;
  message?: string | null;
  errorMessage?: string | null;
  result?: unknown;
  traceId?: string;
  status?: string;
  providerAccepted?: boolean;
  templateName?: string;
  phone?: string;
  messageId?: string | null;
}

interface NotificationAttemptSummary {
  attempted: boolean;
  ok: boolean;
  target: "negocio" | "cliente";
  template: PlantillaWhatsApp;
  toMasked: string;
  free: boolean | null;
  status: string | null;
  traceId: string | null;
  providerAccepted: boolean | null;
  messageId: string | null;
  errorMessage: string | null;
}

function createTraceId() {
  return `pedido-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function maskPhone(phone?: string | null) {
  const raw = typeof phone === "string" ? phone.trim() : "";
  if (!raw) return "unknown";

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "unknown";
  if (digits.length <= 4) return `***${digits}`;

  return `***${digits.slice(-4)}`;
}

function sanitizeParam(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\n|\r|\t/g, " ").replace(/ {5,}/g, " ").trim();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido";
}

function summarizeNotifyResult(params: {
  result: unknown;
  target: "negocio" | "cliente";
  template: PlantillaWhatsApp;
  to: string;
}): NotificationAttemptSummary {
  const { result, target, template, to } = params;
  const safe = (result ?? {}) as NotifyResultLike;

  return {
    attempted: true,
    ok: safe.ok === true,
    target,
    template,
    toMasked: maskPhone(to),
    free: typeof safe.free === "boolean" ? safe.free : null,
    status: typeof safe.status === "string" ? safe.status : null,
    traceId: typeof safe.traceId === "string" ? safe.traceId : null,
    providerAccepted:
      typeof safe.providerAccepted === "boolean" ? safe.providerAccepted : null,
    messageId: typeof safe.messageId === "string" ? safe.messageId : null,
    errorMessage:
      typeof safe.errorMessage === "string"
        ? safe.errorMessage
        : safe.ok === false
          ? "La notificación devolvió ok=false"
          : null,
  };
}

export const createNewPedido = async (
  input: PedidoInput
): Promise<ActionResult> => {
  const actionTraceId = createTraceId();

  console.log(`[createNewPedido][${actionTraceId}] Inicio`);
  console.log(`[createNewPedido][${actionTraceId}] Input recibido:`, {
    slug: input.slug ?? null,
    totalAmount: input.totalAmount,
    itemsCount: input.items.length,
    items: input.items.map((item) => ({
      description: sanitizeParam(item.description),
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      productId: item.productId ?? null,
    })),
    deliveryData: {
      orderType: input.deliveryData.orderType,
      country: input.deliveryData.country ?? null,
      departamento: input.deliveryData.departamento ?? null,
      ciudad: input.deliveryData.ciudad ?? null,
      clientName: sanitizeParam(input.deliveryData.clientName),
      clientPhoneMasked: maskPhone(input.deliveryData.clientPhone),
      deliveryAddress: sanitizeParam(input.deliveryData.deliveryAddress),
      onSiteLocation: sanitizeParam(input.deliveryData.onSiteLocation),
      deliveryDate: input.deliveryData.deliveryDate ?? null,
      hasAdditionalComments: !!sanitizeParam(
        input.deliveryData.additionalComments
      ),
    },
  });

  try {
    const session = await auth();

    console.log(`[createNewPedido][${actionTraceId}] Sesión cargada:`, {
      hasSession: !!session,
      role: session?.user?.role ?? null,
      negocioId: session?.user?.negocioId ?? null,
      negocioSlug: session?.user?.negocioSlug ?? null,
    });

    let negocioId = "";
    let tipoUsuario: TipoUsuario = TipoUsuario.negocio;
    let telefonoNegocio = "";
    const negocioSlug = session?.user.negocioSlug;

    // ============================
    // VALIDACIONES NEGOCIO
    // ============================
    if (input.slug) {
      console.log(
        `[createNewPedido][${actionTraceId}] Buscando negocio por slug...`,
        {
          slug: input.slug,
        }
      );

      const negocio = await prisma.negocio.findUnique({
        where: { slug: input.slug },
        select: { id: true, telefonoContacto: true },
      });

      console.log(
        `[createNewPedido][${actionTraceId}] Resultado búsqueda negocio por slug:`,
        {
          found: !!negocio,
          negocioId: negocio?.id ?? null,
          telefonoNegocioMasked: maskPhone(negocio?.telefonoContacto ?? null),
        }
      );

      if (!negocio) {
        console.warn(
          `[createNewPedido][${actionTraceId}] Negocio no encontrado para slug`
        );
        return { ok: false, message: "Negocio no encontrado." };
      }

      negocioId = negocio.id;
      tipoUsuario = TipoUsuario.usuario;
      telefonoNegocio = negocio.telefonoContacto || "+573132390868";
    } else {
      negocioId = session?.user.negocioId || "";
      tipoUsuario = TipoUsuario.negocio;

      console.log(
        `[createNewPedido][${actionTraceId}] Usando negocio desde sesión`,
        {
          negocioId,
          role: session?.user?.role ?? null,
        }
      );

      if (!negocioId) {
        console.warn(
          `[createNewPedido][${actionTraceId}] No se encontró negocioId en la sesión`
        );
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
    } = input.deliveryData;

    console.log(
      `[createNewPedido][${actionTraceId}] Validando datos de entrega`,
      {
        orderType,
        clientName: sanitizeParam(clientName),
        clientPhoneMasked: maskPhone(clientPhone),
        country: country ?? null,
        departamento: departamento ?? null,
        ciudad: ciudad ?? null,
        deliveryAddress: sanitizeParam(deliveryAddress),
        onSiteLocation: sanitizeParam(onSiteLocation),
      }
    );

    if (orderType === "DELIVERY") {
      if (!country || !departamento || !ciudad || !deliveryAddress) {
        console.warn(
          `[createNewPedido][${actionTraceId}] Validación DELIVERY falló`
        );
        return {
          ok: false,
          message:
            "Faltan datos requeridos para entrega a domicilio: país, departamento, ciudad y dirección son obligatorios.",
        };
      }
    } else if (orderType === "ON_SITE") {
      if (!onSiteLocation) {
        console.warn(
          `[createNewPedido][${actionTraceId}] Validación ON_SITE falló`
        );
        return {
          ok: false,
          message: "La referencia de ubicación es requerida para pedidos en sitio.",
        };
      }
    }

    const deliveryDate = input.deliveryData.deliveryDate
      ? new Date(input.deliveryData.deliveryDate)
      : undefined;

    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) {
      console.warn(
        `[createNewPedido][${actionTraceId}] Fecha de entrega inválida`,
        {
          rawDeliveryDate: input.deliveryData.deliveryDate,
        }
      );
      return { ok: false, message: "Fecha de entrega inválida." };
    }

    // =======================================================
    // 🟩 TRANSACCIÓN — SOLO PRISMA
    // =======================================================
    console.log(
      `[createNewPedido][${actionTraceId}] Iniciando transacción Prisma`
    );

    const {
      newOrderId,
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
          comment: `Pedido ${
            orderType === "DELIVERY" ? "a domicilio" : "en sitio"
          } creado`,
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
        newOrderId: newOrder.id,
        datosPedido,
        valorCompra,
        nombreCliente,
        telefonoCliente,
        descripcionCompra,
        direccionCompra,
        ciudadCompra,
      };
    });

    console.log(
      `[createNewPedido][${actionTraceId}] Transacción completada OK`,
      {
        orderId: newOrderId,
        negocioId,
        tipoUsuario,
        datosPedido: sanitizeParam(datosPedido),
        valorCompra: sanitizeParam(valorCompra),
        nombreCliente: sanitizeParam(nombreCliente),
        telefonoClienteMasked: maskPhone(telefonoCliente),
        direccionCompra: sanitizeParam(direccionCompra),
        ciudadCompra: sanitizeParam(ciudadCompra),
        descripcionCompra: sanitizeParam(descripcionCompra),
      }
    );

    // =======================================================
    // 🟦 NOTIFICACIONES FUERA DE LA TRANSACCIÓN
    // =======================================================

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

    console.log(
      `[createNewPedido][${actionTraceId}] Decisión envío negocio`,
      {
        enviarANegocio,
        sessionRole: session?.user?.role ?? null,
        inputSlug: input.slug ?? null,
        negocioSlugSesion: negocioSlug ?? null,
        telefonoNegocioMasked: maskPhone(telefonoNegocio),
      }
    );

    const sanitizedDatosPedido = sanitizeParam(datosPedido);
    const sanitizedValorCompra = sanitizeParam(valorCompra);
    const sanitizedNombreCliente = sanitizeParam(nombreCliente);
    const sanitizedTelefonoCliente = sanitizeParam(telefonoCliente);
    const sanitizedDescripcionCompra = sanitizeParam(descripcionCompra);
    const sanitizedDireccionCompra = sanitizeParam(direccionCompra);
    const sanitizedCiudadCompra = sanitizeParam(ciudadCompra);

    const notificationSummaries: NotificationAttemptSummary[] = [];

    // Enviar al negocio si corresponde
    if (enviarANegocio) {
      console.log(
        `[createNewPedido][${actionTraceId}] Enviando notificación al negocio`,
        {
          toMasked: maskPhone(telefonoNegocio),
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
          negocioId,
          payloadPreview: {
            datos_pedido: sanitizedDatosPedido,
            valor_compra: sanitizedValorCompra,
            nombre_cliente: sanitizedNombreCliente,
            telefono_cliente_masked: maskPhone(sanitizedTelefonoCliente),
            direccion: sanitizedDireccionCompra,
            descripcion: sanitizedDescripcionCompra,
          },
        }
      );

      try {
        const negocioNotifyRes = await notifyReservaConfirmadaCliente({
          to: telefonoNegocio,
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
          datos_pedido: sanitizedDatosPedido,
          valor_compra: sanitizedValorCompra,
          nombre_cliente: sanitizedNombreCliente,
          telefono_cliente: sanitizedTelefonoCliente,
          direccion: sanitizedDireccionCompra,
          descripcion: sanitizedDescripcionCompra,
          negocioId,
        });

        const negocioSummary = summarizeNotifyResult({
          result: negocioNotifyRes,
          target: "negocio",
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
          to: telefonoNegocio,
        });

        notificationSummaries.push(negocioSummary);

        console.log(
          `[createNewPedido][${actionTraceId}] Resultado notificación negocio`,
          negocioSummary
        );
      } catch (notifyError) {
        const errorMessage = getErrorMessage(notifyError);

        console.error(
          `[createNewPedido][${actionTraceId}] Error lanzado al notificar negocio:`,
          notifyError
        );

        notificationSummaries.push({
          attempted: true,
          ok: false,
          target: "negocio",
          template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
          toMasked: maskPhone(telefonoNegocio),
          free: null,
          status: "exception",
          traceId: null,
          providerAccepted: false,
          messageId: null,
          errorMessage,
        });
      }
    } else {
      console.log(
        `[createNewPedido][${actionTraceId}] Se omite notificación al negocio por lógica actual`
      );
    }

    // Enviar al cliente (adaptando plantilla según rol)
    const templateCliente =
      session?.user.role === "negocio"
        ? PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO
        : PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO;

    console.log(
      `[createNewPedido][${actionTraceId}] Enviando notificación al cliente`,
      {
        toMasked: maskPhone(telefonoCliente),
        templateCliente,
        sessionRole: session?.user?.role ?? null,
        negocioId,
        payloadPreview: {
          datos_pedido: sanitizedDatosPedido,
          valor_compra: sanitizedValorCompra,
          nombre_cliente: sanitizedNombreCliente,
          direccion: sanitizedDireccionCompra,
          ciudad: sanitizedCiudadCompra,
        },
      }
    );

    try {
      const clienteNotifyRes =
        session?.user.role === "negocio"
          ? await notifyReservaConfirmadaCliente({
              to: telefonoCliente,
              template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO,
              datos_pedido: sanitizedDatosPedido,
              valor_compra: sanitizedValorCompra,
              nombre_cliente: sanitizedNombreCliente,
              direccion: sanitizedDireccionCompra,
              negocioId,
            })
          : await notifyReservaConfirmadaCliente({
              to: telefonoCliente,
              template: PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
              datos_pedido: sanitizedDatosPedido,
              valor_compra: sanitizedValorCompra,
              nombre_cliente: sanitizedNombreCliente,
              direccion: sanitizedDireccionCompra,
              ciudad: sanitizedCiudadCompra,
              negocioId,
            });

      const clienteSummary = summarizeNotifyResult({
        result: clienteNotifyRes,
        target: "cliente",
        template: templateCliente,
        to: telefonoCliente,
      });

      notificationSummaries.push(clienteSummary);

      console.log(
        `[createNewPedido][${actionTraceId}] Resultado notificación cliente`,
        clienteSummary
      );
    } catch (notifyError) {
      const errorMessage = getErrorMessage(notifyError);

      console.error(
        `[createNewPedido][${actionTraceId}] Error lanzado al notificar cliente:`,
        notifyError
      );

      notificationSummaries.push({
        attempted: true,
        ok: false,
        target: "cliente",
        template: templateCliente,
        toMasked: maskPhone(telefonoCliente),
        free: null,
        status: "exception",
        traceId: null,
        providerAccepted: false,
        messageId: null,
        errorMessage,
      });
    }

    console.log(
      `[createNewPedido][${actionTraceId}] Resumen final de notificaciones`,
      notificationSummaries
    );

    const failedNotifications = notificationSummaries.filter(
      (item) => item.attempted && !item.ok
    );

    if (failedNotifications.length > 0) {
      console.warn(
        `[createNewPedido][${actionTraceId}] Pedido creado, pero hay notificaciones con fallo`,
        failedNotifications
      );

      return {
        ok: true,
        message:
          "Pedido creado exitosamente. Pero no se pudo confirmar el envío de una o más notificaciones por WhatsApp.",
      };
    }

    console.log(
      `[createNewPedido][${actionTraceId}] Pedido creado y notificaciones procesadas correctamente`
    );

    return { ok: true, message: "Pedido creado exitosamente." };
  } catch (error) {
    console.error(
      `[createNewPedido][${actionTraceId}] Error al crear el pedido:`,
      error
    );

    return {
      ok: false,
      message:
        error instanceof Error
          ? `Error al crear el pedido: ${error.message}`
          : "Error desconocido",
    };
  }
};