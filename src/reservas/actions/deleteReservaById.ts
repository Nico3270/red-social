"use server";

import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

interface DeleteReservaResponse {
  ok: boolean;
  message: string;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const normalized = phone.trim();
  if (normalized.length <= 4) return normalized;
  return `***${normalized.slice(-4)}`;
}

export const deleteReservaById = async (
  id: string,
  nombre_cliente: string,
  fecha_hora: string,
  negocioId: string,
  telefono_cliente: string
): Promise<DeleteReservaResponse> => {
  const traceId = `deleteReserva-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  console.log(`[deleteReservaById][${traceId}] Inicio`, {
    id,
    negocioId,
    nombre_cliente,
    fecha_hora,
    telefono_cliente_masked: maskPhone(telefono_cliente),
  });

  if (!id?.trim()) {
    console.warn(`[deleteReservaById][${traceId}] ID inválido`);
    return {
      ok: false,
      message: "No se ha encontrado una reserva",
    };
  }

  try {
    /* ===========================================================
       1. VALIDAR QUE EXISTA
    ============================================================ */
    const reservaExistente = await prisma.reservation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!reservaExistente) {
      console.warn(
        `[deleteReservaById][${traceId}] La reserva no existe o ya fue eliminada`
      );
      return {
        ok: false,
        message: "La reserva no existe o ya fue eliminada",
      };
    }

    /* ===========================================================
       2. ELIMINAR RESERVA
    ============================================================ */
    await prisma.reservation.delete({
      where: { id },
    });

    console.log(`[deleteReservaById][${traceId}] Reserva eliminada OK`, { id });

    /* ===========================================================
       3. OBTENER TELÉFONO DEL NEGOCIO
    ============================================================ */
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { telefonoContacto: true },
    });

    const telefonoNegocio = negocio?.telefonoContacto?.trim() || "";

    console.log(
      `[deleteReservaById][${traceId}] Teléfono negocio obtenido`,
      {
        telefonoNegocio_masked: maskPhone(telefonoNegocio),
      }
    );

    /* ===========================================================
       4. ENVIAR NOTIFICACIÓN (AWAIT, SIN ROMPER LA ELIMINACIÓN)
    ============================================================ */
    if (telefonoNegocio) {
      try {
        const notificacionCambio = await notifyReservaConfirmadaCliente({
          to: telefonoNegocio,
          nombre_cliente,
          fechaHora: fecha_hora,
          telefono_cliente,
          template: PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO,
          negocioId,
        });

        console.log(
          `[deleteReservaById][${traceId}] Resultado notificación`,
          {
            ok: notificacionCambio.ok,
            free: notificacionCambio.free,
            message: notificacionCambio.message,
            errorMessage: notificacionCambio.errorMessage,
          }
        );

        if (!notificacionCambio.ok) {
          console.warn(
            `[deleteReservaById][${traceId}] La reserva se eliminó, pero falló la notificación`,
            {
              error:
                notificacionCambio.errorMessage ??
                notificacionCambio.message ??
                "Sin detalle",
            }
          );
        }
      } catch (notifyError) {
        console.error(
          `[deleteReservaById][${traceId}] Error enviando notificación WhatsApp`,
          notifyError
        );
      }
    } else {
      console.warn(
        `[deleteReservaById][${traceId}] La reserva se eliminó, pero el negocio no tiene teléfono de contacto`
      );
    }

    /* ===========================================================
       5. RESPUESTA FINAL
    ============================================================ */
    return {
      ok: true,
      message: "Reserva eliminada exitosamente",
    };
  } catch (error) {
    console.error(`[deleteReservaById][${traceId}] Error general:`, error);

    return {
      ok: false,
      message: `No se logró eliminar la reserva: ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
    };
  }
};