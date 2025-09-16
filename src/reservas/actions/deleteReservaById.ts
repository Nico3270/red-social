"use server"

import prisma from "@/lib/prisma"
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva"
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp"

interface DeleteReservaResponse {
    ok: boolean,
    message: string
}

export const deleteReservaById = async (id: string, nombre_cliente: string, fecha_hora: string, negocioId: string, telefono_cliente: string): Promise<DeleteReservaResponse> => {
    if (!id) {
        return {
            ok: false,
            message: "No se ha encontrado una reserva"
        }
    }
    try {
        const deleteReserva = await prisma.reservation.delete({
            where: { id }
        })


        if (!deleteReserva) {
            return {
                ok: false,
                message: "Ocurrío un error al eliminar la reserva"
            }
        }

        // console.log({negocioId}," en deleReservaById");


        const notificacionCambio = await notifyReservaConfirmadaCliente(
            {
                to: "+573132390868",
                nombre_cliente: nombre_cliente,
                fechaHora: fecha_hora,
                telefono_cliente: telefono_cliente,
                template: PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO,
                negocioId: negocioId,
            }
        )

        if (!notificacionCambio.ok) {
            console.warn('Notificación WhatsApp fallida, pero reserva creada:',);
            // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
        }

        return {
            // Notificación negocio que se cancela una reserva
            ok: true, message: "Reserva eliminada exitosamente"
        }
    } catch (error) {
        return {
            ok: false,
            message: `No se logro eliminar la reserva ${error}`
        }
    }

}

