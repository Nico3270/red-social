// /actions/dashboard/createEditarReserva.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

function formatearFecha(fechaInput?: string | Date): string {
  if (!fechaInput) {
    return "La fecha no esta disponible";
  }
  
  const fechaObj = new Date(fechaInput);

  // Usar Intl.DateTimeFormat con zona horaria específica (America/Bogota para Colombia, UTC-5)
  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  };

  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  };

  const fechaStr = fechaObj.toLocaleDateString("es-ES", optionsDate);
  const horaStr = fechaObj.toLocaleTimeString("es-ES", optionsTime);

  return `${fechaStr} a las ${horaStr}`;
}

// Schema para validación
const schema = z.object({
  id: z.string().optional(), // Para edit
  nombre: z.string().min(3),
  telefono: z.string().min(7),
  estado: z.enum(['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA']),
  fechaHoraInicio: z.string().min(1),
  fechaHoraFin: z.string().optional(),
  notas: z.string().optional(),
  negocioId: z.string().optional(), // Solo si dueño
});

export interface ReservationFormData {
  id?: string; // idReserva para edit
  nombre: string;
  telefono: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'BLOQUEADA';
  fechaHoraInicio: string; // ISO string para consistencia
  fechaHoraFin?: string;
  notas?: string; // Opcional
}


interface Response {
  ok: boolean;
  message: string;
  reserva?: ReservationFormData;
}

export async function createEditarReserva(data: unknown): Promise<Response> {
  const session = await auth();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: `Datos inválidos: ${parsed.error.errors[0].message}` };
  }

  const { id, negocioId, ...resData } = parsed.data;
  const negocio = await prisma.negocio.findUnique({
  where: { id: negocioId || "" },
  select: { telefonoContacto: true },
});

const telefonoNegocio = negocio?.telefonoContacto || "+573132390868";

  try {
    let result;
    if (id) {
      // Modo edit: Verificar ownership

      const existing = await prisma.reservation.findUnique({ where: { id } });
      if (!existing || (negocioId && existing.negocioId !== negocioId)) {
        return { ok: false, message: "No tienes permiso para editar esta reserva" };
      }
      result = await prisma.reservation.update({
        where: { id },
        data: resData,
      });
    }

    // Modo crear reserva

    else {
      // Modo create: Asignar negocioId si dueño, o inferir si usuario
      const finalNegocioId = negocioId;
      // const finalNegocioId = negocioId || session.user.negocioId;
      if (!finalNegocioId) {
        return { ok: false, message: "Negocio no especificado" };
      }
      result = await prisma.reservation.create({
        data: {
          ...resData,
          negocioId: finalNegocioId,
          // usuarioId: session.user.id || null, // Si guest, null
        },
      });
    }


    // Notificaciones por whatsapp

    // Unir en un string
    const fecha = formatearFecha(resData.fechaHoraInicio);
    const fecha_nueva = formatearFecha(resData.fechaHoraFin);
    const fecha_anterior = fecha
    


    // Reserva creada por el negocio
    // todo: Reserca creada por el negocio - Aviso al cliente

    if (session?.user.role === "negocio" && session.user.negocioId === negocioId && !id) {
      const notificacion = await notifyReservaConfirmadaCliente(
        {
          to: parsed.data.telefono || "+573182293083",
          nombre_cliente: resData.nombre,
          fechaHora: fecha || "Error en fecha",
          template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
          enlace_cancelar: `https://myckeo.com/reservas/eliminar/${result.id}`, // Ajusta según tu dominio real
          descripcion: resData.notas || '',
          negocioId: negocioId || "", // Incluye negocioId para contexto
        }
      )
      if (!notificacion.ok) {
        console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacion.message);
        // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
      }
    }

    // todo: Reserva creada por el usuario - Aviso al aviso al negocio y cliente

    if (!session || session.user.role !== "negocio") {
      const notificacion = await notifyReservaConfirmadaCliente(
        {
          to: telefonoNegocio || "+573132390868",
          nombre_cliente: resData.nombre,
          telefono_cliente: resData.telefono,
          fechaHora: fecha || "Error en fecha",
          template: PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA,
          negocioId: negocioId || "", // Incluye negocioId para contexto
        })

      if (!notificacion.ok) {
        console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacion.message);
        // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
      }
      // console.log("Notificación enviada al negocio");

      // Reserva creada por el usuario - Aviso al usuario
      const notificacionUsuario = await notifyReservaConfirmadaCliente(
        {
          to: parsed.data.telefono || "+573182293083",
          nombre_cliente: resData.nombre,
          fechaHora: fecha || "Error en fecha",
          template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
          enlace_cancelar: `https://myckeo.com/reservas/eliminar/${result.id}`, // Ajusta según tu dominio real
          descripcion: resData.notas || '',
          negocioId: negocioId || "", // Incluye negocioId para contexto
        }
      )
      if (!notificacionUsuario.ok) {
        console.warn('Notificación WhatsApp fallida, pero reserva creada:', notificacion.message);
        // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
      }
      // console.log("Notificación enviada al cliente");
    }

    //todo: Reserca editada - Aviso al cliente 

    if (id) {
      const notificacionCambio = await notifyReservaConfirmadaCliente(
        {
          to: parsed.data.telefono || "+573182293083",
          fecha_anterior,
          fecha_nueva, 
          nombre_cliente: resData.nombre,
          template: PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO,
          enlace_cancelar: `https://myckeo.com/reservas/eliminar/${result.id}`, // Ajusta según tu dominio real
          negocioId: negocioId || "", // Incluye negocioId para contexto
        }
      )

      if (!notificacionCambio.ok) {
        console.warn('Notificación WhatsApp fallida, pero reserva creada:', );
        // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
      }
      if (notificacionCambio.ok) {
        console.log('Notificación enviada exitosamente, pero reserva creada:', );
        // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
      }
    }

    return {
      ok: true,
      message: id ? "Reserva actualizada exitosamente" : "Reserva creada exitosamente",
      reserva: {
        id: result.id,
        nombre: result.nombre,
        telefono: result.telefono,
        estado: result.estado,
        fechaHoraInicio: result.fechaHoraInicio.toISOString(), // Convertir Date a string ISO
        fechaHoraFin: result.fechaHoraFin?.toISOString() ?? undefined, // Convertir o undefined
        notas: result.notas ?? undefined, // Manejar null a undefined
      },
    };
  } catch (error) {
    console.error("Error en createEditarReserva:", error);
    return { ok: false, message: "Error interno al procesar la reserva" };
  }
}