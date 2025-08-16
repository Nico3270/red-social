"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";

// Interface compartida para respuestas estandarizadas (elegante y reusable)
interface ActionResponse {
  ok: boolean;
  message: string;
}

// Schema para validación de deleteReserva
const deleteSchema = z.object({
  negocioId: z.string().min(1, "ID del negocio requerido"),
  reservaId: z.string().min(1, "ID de la reserva requerido"), // Corregí "id de la transaccion" a "reservaId" para claridad
});

// Schema para validación de changeStatusReservations
const changeStatusSchema = z.object({
  negocioId: z.string().min(1, "ID del negocio requerido"),
  reservaId: z.string().min(1, "ID de la reserva requerido"),
  nuevoStatus: z.enum(["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"]),
});

// Server Action: Eliminar una reserva (con verificación de ownership)
export async function deleteReserva(data: unknown): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id) {
    return { ok: false, message: "Usuario no autenticado" };
  }

  const parsed = deleteSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: `Datos inválidos: ${parsed.error.errors[0].message}` };
  }

  const { negocioId, reservaId } = parsed.data;

  try {
    // Verificar si la reserva existe y pertenece al negocio
    const reserva = await prisma.reservation.findUnique({
      where: { id: reservaId },
      select: { id: true, negocioId: true },
    });

    if (!reserva) {
      return { ok: false, message: "Reserva no encontrada" };
    }

    if (reserva.negocioId !== negocioId) {
      return { ok: false, message: "No tienes permiso para eliminar esta reserva (no pertenece al negocio)" };
    }

    // Eliminar la reserva (transacción atómica)
    await prisma.reservation.delete({
      where: { id: reservaId },
    });

    return { ok: true, message: "Reserva eliminada exitosamente" };
  } catch (error) {
    console.error("Error al eliminar reserva:", error);
    return { ok: false, message: "Error interno al eliminar la reserva" };
  }
}

// Server Action: Cambiar el status de una reserva (con verificación de ownership)
export async function changeStatusReservations(data: unknown): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id) {
    return { ok: false, message: "Usuario no autenticado" };
  }

  const parsed = changeStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: `Datos inválidos: ${parsed.error.errors[0].message}` };
  }

  const { negocioId, reservaId, nuevoStatus } = parsed.data;

  try {
    // Verificar si la reserva existe y pertenece al negocio
    const reserva = await prisma.reservation.findUnique({
      where: { id: reservaId },
      select: { id: true, negocioId: true },
    });

    if (!reserva) {
      return { ok: false, message: "Reserva no encontrada" };
    }

    if (reserva.negocioId !== negocioId) {
      return { ok: false, message: "No tienes permiso para cambiar el status de esta reserva (no pertenece al negocio)" };
    }

    // Actualizar el status (transacción atómica)
    await prisma.reservation.update({
      where: { id: reservaId },
      data: { estado: nuevoStatus },
    });

    return { ok: true, message: `Status cambiado a ${nuevoStatus} exitosamente` };
  } catch (error) {
    console.error("Error al cambiar status de reserva:", error);
    return { ok: false, message: "Error interno al cambiar el status de la reserva" };
  }
}