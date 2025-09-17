"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { TipoUsuario } from "@prisma/client";

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

        const session = await auth()

        let negocioId = ""
        let tipoUsuario: TipoUsuario = TipoUsuario.negocio


        if (input.slug) {
            // Caso: usuario crea la orden
            const negocio = await prisma.negocio.findUnique({
                where: { slug: input.slug },
                select: { id: true },
            });

            if (!negocio) {
                return { ok: false, message: "Negocio no encontrado." };
            }

            negocioId = negocio.id;
            tipoUsuario = TipoUsuario.usuario;

        } else {
            // Caso: negocio crea la orden (desde sesión)
            negocioId = session?.user.negocioId || "";
            tipoUsuario = TipoUsuario.negocio;

            if (!negocioId) {
                return { ok: false, message: "No se encontró el negocio en la sesión." };
            }
        }



        // Encontrar el negocio por slug


        // Parsear deliveryDate a Date
        const deliveryDate = new Date(input.deliveryData.deliveryDate);

        return await prisma.$transaction(async (tx) => {
            // Crear DeliveryData
            const newDeliveryData = await tx.deliveryData.create({
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

            // Crear Order
            const newOrder = await tx.order.create({
                data: {
                    type: "ingreso", // Asumiendo ingreso para el negocio
                    description: generatedDescription,
                    totalAmount: input.totalAmount,
                    category: "ventas",
                    status: "Recibida",
                    TipoUsuario: tipoUsuario,
                    negocioId: negocioId,
                    deliveryDataId: newDeliveryData.id,
                    // paymentMethod: null o algún default si es requerido, pero es opcional
                    // userId: null (opcional)
                },
            });

            // Crear OrderItems
            await tx.orderItem.createMany({
                data: input.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
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
                    comment: "Pedido creado",
                },
            });

            // todo: Reserca creada por el negocio - Aviso al negocio
            // Construir el string de los productos: "2 - Hamburguesa, 1 - Gaseosa"
            const datosPedido = input.items
                .map((item) => `${item.quantity} - ${item.description}`)
                .join(", ");

            // Valor total ya lo tienes en input.totalAmount
            const valorCompra = `$${input.totalAmount.toFixed(2)}`;
            const direccionCompra = input.deliveryData.deliveryAddress
            const ciudadCompra = input.deliveryData.ciudad
            const descripcionCompra = input.deliveryData.additionalComments || ""
            const direccionCliente = input.deliveryData.deliveryAddress || ""

            // Datos del cliente
            const nombreCliente = input.deliveryData.clientName;
            const telefonoCliente = input.deliveryData.clientPhone;

            if (session?.user.role === "negocio") {
                const notificacionUsuario = await notifyReservaConfirmadaCliente(
                    {
                        to: "+573182293083",
                        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO,
                        datos_pedido: sanitizeParam(datosPedido),
                        valor_compra: sanitizeParam(valorCompra),
                        nombre_cliente: sanitizeParam(nombreCliente),
                        direccion: sanitizeParam(direccionCompra),
                        negocioId: negocioId || "", // Incluye negocioId para contexto
                    }
                )
                if (!notificacionUsuario.ok) {
                    console.warn('Notificación WhatsApp fallida, pero reserva creada: error en plantilla pedido creado negocio usuario');
                    // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
                }
            }

            if (session?.user.role !== "negocio" || !session.user) {
                const notificacion = await notifyReservaConfirmadaCliente(
                    {
                        to: "+573132390868",
                        template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
                        datos_pedido: sanitizeParam(datosPedido),
                        valor_compra: sanitizeParam(valorCompra),
                        nombre_cliente: sanitizeParam(nombreCliente),
                        telefono_cliente: telefonoCliente,
                        direccion: sanitizeParam(direccionCliente),
                        descripcion: sanitizeParam(descripcionCompra),
                        negocioId: negocioId || "", // Incluye negocioId para contexto
                    }
                )
                if (!notificacion.ok) {
                    console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacion.message);
                    // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
                }

                const notificacionUsuario = await notifyReservaConfirmadaCliente(
                    {
                        to: "+573182293083",
                        template: PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
                        datos_pedido: sanitizeParam(datosPedido),
                        valor_compra: sanitizeParam(valorCompra),
                        nombre_cliente: sanitizeParam(nombreCliente),
                        direccion: sanitizeParam(direccionCompra),
                        ciudad: sanitizeParam(ciudadCompra),
                        negocioId: negocioId || "", // Incluye negocioId para contexto
                    }
                )
                if (!notificacionUsuario.ok) {
                    console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacion.message);
                    // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
                }
            }

            return { ok: true, message: "Pedido creado exitosamente." };
        });
    } catch (error) {
        console.error("Error al crear el pedido:", error);
        return { ok: false, message: "Error al crear el pedido." };
    }
};

function sanitizeParam(text: string): string {
  if (!text) return "";
  return text
    .replace(/\n|\r|\t/g, " ")   // quita saltos de línea y tabs
    .replace(/ {5,}/g, " ")      // evita más de 4 espacios seguidos
    .trim();                     // elimina espacios al inicio/fin
}