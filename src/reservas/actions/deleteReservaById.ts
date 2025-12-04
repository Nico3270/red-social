"use server"

import prisma from "@/lib/prisma"
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva"
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp"

interface DeleteReservaResponse {
    ok: boolean,
    message: string
}

export const deleteReservaById = async (
    id: string,
    nombre_cliente: string,
    fecha_hora: string,
    negocioId: string,
    telefono_cliente: string
): Promise<DeleteReservaResponse> => {

    if (!id) {
        return {
            ok: false,
            message: "No se ha encontrado una reserva"
        }
    }

    try {
        /* ===========================================================
           1. ELIMINAR RESERVA (rápido, directo, sin bloqueos)
        ============================================================ */
        const deleteReserva = await prisma.reservation.delete({
            where: { id }
        })

        if (!deleteReserva) {
            return {
                ok: false,
                message: "Ocurrió un error al eliminar la reserva"
            }
        }

        /* ===========================================================
           2. OBTENER TELÉFONO DEL NEGOCIO (antes de WhatsApp)
        ============================================================ */
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId || "" },
            select: { telefonoContacto: true },
        })

        const telefonoNegocio = negocio?.telefonoContacto || "+573132390868"

        /* ===========================================================
           3. RESPONDER AL FRONT RÁPIDO (WhatsApp NO BLOQUEA)
        ============================================================ */
        // Respondemos antes de enviar el WhatsApp
        const response: DeleteReservaResponse = {
            ok: true,
            message: "Reserva eliminada exitosamente"
        }

        /* ===========================================================
           4. ENVIAR NOTIFICACIÓN (fuera del flujo principal)
        ============================================================ */
        // No bloquear la respuesta → dejar que WhatsApp se ejecute luego
        ;(async () => {
            try {
                const notificacionCambio = await notifyReservaConfirmadaCliente({
                    to: telefonoNegocio,
                    nombre_cliente,
                    fechaHora: fecha_hora,
                    telefono_cliente,
                    template: PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO,
                    negocioId,
                })

                if (!notificacionCambio.ok) {
                    console.warn(
                        "[deleteReservaById] Notificación WhatsApp fallida →",
                        notificacionCambio.message
                    )
                }
            } catch (err) {
                console.error(
                    "[deleteReservaById] Error enviando notificación WhatsApp:",
                    err
                )
            }
        })()

        return response

    } catch (error) {
        console.error("[deleteReservaById] Error:", error)
        return {
            ok: false,
            message: `No se logró eliminar la reserva: ${error instanceof Error ? error.message : "Error desconocido"}`
        }
    }
}
