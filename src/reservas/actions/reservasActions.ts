"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";
import { ReservationStatus } from "@prisma/client";
import { getInformacionReserva } from "./getInfoNegocioWhatsapp";
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";


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

function formatearFecha(fechaInput?: string | Date): string {
  if (!fechaInput){
    return "La fecha no esta disponible"
  }
  const fechaObj = new Date(fechaInput);

  const fechaStr = fechaObj.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const horaStr = fechaObj.toLocaleTimeString("es-ES", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  return `${fechaStr} a las ${horaStr}`;
}



// Schema para validación de changeStatusReservations
const changeStatusSchema = z.object({
  negocioId: z.string().min(1, "ID del negocio requerido"),
  reservaId: z.string().min(1, "ID de la reserva requerido"),
  nuevoStatus: z.enum(["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"]),
});



// Server Action: Eliminar una reserva (con verificación de ownership)
export async function deleteReserva(data: unknown): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id && !session.user.negocioId) {
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

    

    const info = await getInformacionReserva(reservaId);
    const nombre_cliente = info.nombre_cliente || "Cliente desconocido"
    const fecha_hora = formatearFecha(info.fecha_hora)
 

    // Eliminar la reserva (transacción atómica)
    await prisma.reservation.delete({
      where: { id: reservaId },
    });
    

    const notificacionUsuario = await notifyReservaConfirmadaCliente(
      {
        to: "+573182293083",
        nombre_cliente,
        fechaHora: fecha_hora,
        template: PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO,
        negocioId: negocioId || "", // Incluye negocioId para contexto

      }
    )
    if (!notificacionUsuario.ok) {
      console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacionUsuario.message);
      // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
    }

    return { ok: true, message: "Reserva eliminada exitosamente" };
    // Notificación al usuario de reserva cancelada




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
      select: { id: true, negocioId: true, nombre:true, telefono:true, fechaHoraInicio:true },
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

    // Notificación a whatsapp cliente de reserva cancelada
    if(nuevoStatus === "CANCELADA"){
      const fechaHora = formatearFecha(reserva.fechaHoraInicio)
      const notificacionUsuario = await notifyReservaConfirmadaCliente(
      {
        to: "+573182293083",
        nombre_cliente: reserva.nombre,
        fechaHora ,
        template: PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO,
        negocioId: negocioId || "", // Incluye negocioId para contexto

      }
    )
    if (!notificacionUsuario.ok) {
      console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacionUsuario.message);
      // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
    }

    }

    return { ok: true, message: `Status cambiado a ${nuevoStatus} exitosamente, se enviará una notificación al usuario` };
  } catch (error) {
    console.error("Error al cambiar status de reserva:", error);
    return { ok: false, message: "Error interno al cambiar el status de la reserva" };
  }
}



// Schema para bloquear
const blockSchema = z.object({
  negocioId: z.string().min(1),
  fechaHoraInicio: z.string(), // ISO
  fechaHoraFin: z.string(),
});


// Opcional: Schema para validar reservaData (para más seguridad)
const reservaSchema = z.object({
  nombre: z.string(),
  telefono: z.string(),
  fechaHoraInicio: z.date(),
  fechaHoraFin: z.date(),
  notas: z.string(),
  estado: z.literal('BLOQUEADA'),  // Fuerza solo 'BLOQUEADA' para este caso
  negocioId: z.string(),
  usuarioId: z.string().nullable(),
});

export async function blockSlot(data: unknown): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id) return { ok: false, message: "No autenticado" };

  const parsed = blockSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { negocioId, fechaHoraInicio, fechaHoraFin } = parsed.data;
  console.log({ negocioId, fechaHoraInicio, fechaHoraFin });

  try {
    // Verificación de ownership
    const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
    console.log("Negocio encontrado:", negocio);
    if (!negocio || negocio.id !== session.user.negocioId) {
      return { ok: false, message: "No tienes permiso para bloquear en este negocio" };
    }

    // Prepara y valida reservaData
    const reservaData = {
      nombre: "Bloqueado",
      telefono: "N/A",
      fechaHoraInicio: new Date(fechaHoraInicio),
      fechaHoraFin: new Date(fechaHoraFin),
      notas: "Bloqueo manual",
      estado: ReservationStatus.BLOQUEADA,
      negocioId,
      usuarioId: session.user.id || null,
    };
    reservaSchema.parse(reservaData);  // Validación opcional con Zod
    console.log("Intentando crear reserva con data:", reservaData);

    // Crea reserva
    const createdReserva = await prisma.reservation.create({
      data: reservaData,
    });
    console.log("Reserva creada exitosamente:", createdReserva);

    return { ok: true, message: "Slots bloqueados exitosamente" };
  } catch (error) {
    console.error("Error detallado en blockSlot:", error);
    return { ok: false, message: "Error al bloquear: " + (error instanceof Error ? error.message : "Desconocido") };
  }
}