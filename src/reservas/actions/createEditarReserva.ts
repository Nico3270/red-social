"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

/* -------------------------------------------------------------------------- */
/*                              UTILIDADES                                   */
/* -------------------------------------------------------------------------- */
function formatearFecha(fechaInput?: string | Date): string {
  if (!fechaInput) return "La fecha no está disponible";

  const fechaObj = new Date(fechaInput);
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

/* -------------------------------------------------------------------------- */
/*                              VALIDACIÓN                                   */
/* -------------------------------------------------------------------------- */
const schema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(3, "Nombre requerido (mínimo 3 caracteres)"),
  telefono: z.string().min(7, "Teléfono requerido"),
  estado: z.enum(["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"]),
  fechaHoraInicio: z.string().min(1, "Hora de inicio requerida"),
  fechaHoraFin: z.string().optional(),
  notas: z.string().optional(),
  negocioId: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/*                              TIPOS                                        */
/* -------------------------------------------------------------------------- */
export interface ReservationFormData {
  id?: string;
  nombre: string;
  telefono: string;
  estado:
    | "PENDIENTE"
    | "CONFIRMADA"
    | "CANCELADA"
    | "COMPLETADA"
    | "BLOQUEADA";
  fechaHoraInicio: string;
  fechaHoraFin?: string;
  notas?: string;
}

interface Response {
  ok: boolean;
  message: string;
  reserva?: ReservationFormData;
}

/* -------------------------------------------------------------------------- */
/*                              LOGS (solo DEV)                               */
/* -------------------------------------------------------------------------- */
const isDev = process.env.NODE_ENV === "development";

function devLog(...args: unknown[]) {
  if (isDev) console.log("[createEditarReserva]", ...args);
}

/* -------------------------------------------------------------------------- */
/*                              SERVER ACTION                                 */
/* -------------------------------------------------------------------------- */
export async function createEditarReserva(
  data: unknown
): Promise<Response> {
  const session = await auth();

  /* ------------------- VALIDACIÓN DE ENTRADA ------------------- */
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    devLog("Datos inválidos →", parsed.error.errors[0].message);
    return { ok: false, message: `Datos inválidos: ${parsed.error.errors[0].message}` };
  }

  const { id, negocioId, ...resData } = parsed.data;

  devLog("Datos recibidos →", {
    id,
    negocioId,
    ...resData,
    sessionUser: session?.user ?? "guest",
  });

  /* ------------------- TELÉFONO DEL NEGOCIO DESTINO ------------------- */
  const negocio = await prisma.negocio.findUnique({
    where: { id: negocioId ?? "" },
    select: { telefonoContacto: true },
  });
  const telefonoNegocio = negocio?.telefonoContacto ?? "+573132390868";

  /* ---------------------------------------------------------------------- */
  /*                  1) EJECUTAR TODA LA LÓGICA DE PRISMA                 */
  /* ---------------------------------------------------------------------- */

  let result;
  let existingReservaFechaInicio: Date | null = null;

  try {
    /* ------------------- MODO EDITAR ------------------- */
    if (id) {
      const existing = await prisma.reservation.findUnique({ where: { id } });

      if (!existing || (negocioId && existing.negocioId !== negocioId)) {
        devLog("Permiso denegado para editar reserva", id);
        return { ok: false, message: "No tienes permiso para editar esta reserva" };
      }

      existingReservaFechaInicio = existing.fechaHoraInicio;

      result = await prisma.reservation.update({
        where: { id },
        data: resData,
      });

      devLog("Reserva actualizada →", result.id);
    }
    /* ------------------- MODO CREAR ------------------- */
    else {
      if (!negocioId) {
        devLog("Falta negocioId al crear reserva");
        return { ok: false, message: "Negocio no especificado" };
      }

      result = await prisma.reservation.create({
        data: {
          ...resData,
          negocioId,
        },
      });

      devLog("Reserva creada →", result.id);
    }
  } catch (error) {
    console.error("[createEditarReserva] Error en prisma:", error);
    return { ok: false, message: "Error interno al guardar la reserva" };
  }

  /* ---------------------------------------------------------------------- */
  /*               2) AHORA QUE PRISMA TERMINÓ → ENVIAR NOTIFICACIONES     */
  /* ---------------------------------------------------------------------- */

  const fecha = formatearFecha(resData.fechaHoraInicio);
  const enlaceCancelar = `https://myckeo.com/reservas/eliminar/${result.id}`;

  /* ------------------- SI EL NEGOCIO LA CREA (dueño → cliente) ------------------- */
  const esDueno =
    session?.user?.role === "negocio" &&
    session.user.negocioId === negocioId &&
    !id;

  if (esDueno) {
    devLog("Enviando confirmación al cliente (dueño crea reserva)");

    const notif = await notifyReservaConfirmadaCliente({
      to: parsed.data.telefono ?? "+573182293083",
      nombre_cliente: resData.nombre,
      fechaHora: fecha,
      template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
      enlace_cancelar: enlaceCancelar,
      descripcion: resData.notas ?? "",
      negocioId: negocioId ?? "",
    });

    devLog("Resultado notif cliente (dueño) →", notif.ok ? "OK" : `FAIL: ${notif.message}`);

    if (!notif.ok) {
      console.warn(
        "[createEditarReserva] Notificación fallida (dueño → cliente):",
        notif.message
      );
    }
  }

  /* ------------------- SI LA CREA UN CLIENTE EXTERNO ------------------- */
  const esClienteExterno =
    !session ||
    session.user.role !== "negocio" ||
    session.user.negocioId !== negocioId;

  if (esClienteExterno) {
    /* --- 2a) Notificar al negocio --- */
    devLog("Enviando notificación al negocio destino");

    const notifNegocio = await notifyReservaConfirmadaCliente({
      to: telefonoNegocio,
      nombre_cliente: resData.nombre,
      telefono_cliente: resData.telefono,
      fechaHora: fecha,
      template: PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA,
      negocioId: negocioId ?? "",
    });

    devLog("Resultado notif negocio →", notifNegocio.ok ? "OK" : `FAIL: ${notifNegocio.message}`);

    if (!notifNegocio.ok) {
      console.warn(
        "[createEditarReserva] Notificación fallida (cliente → negocio):",
        notifNegocio.message
      );
    }

    /* --- 2b) Confirmación al cliente --- */
    devLog("Enviando confirmación al cliente");

    const notifCliente = await notifyReservaConfirmadaCliente({
      to: parsed.data.telefono ?? "+573182293083",
      nombre_cliente: resData.nombre,
      fechaHora: fecha,
      template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
      enlace_cancelar: enlaceCancelar,
      descripcion: resData.notas ?? "",
      negocioId: negocioId ?? "",
    });

    devLog("Resultado notif cliente →", notifCliente.ok ? "OK" : `FAIL: ${notifCliente.message}`);

    if (!notifCliente.ok) {
      console.warn(
        "[createEditarReserva] Notificación fallida (cliente → cliente):",
        notifCliente.message
      );
    }
  }

  /* ------------------- REPROGRAMACIÓN (solo si id existe) ------------------- */
  if (id) {
    const fechaAnterior = existingReservaFechaInicio
      ? formatearFecha(existingReservaFechaInicio)
      : fecha;

    const fechaNueva = formatearFecha(resData.fechaHoraFin);

    devLog("Enviando notificación de reprogramación");

    const notifReprogram = await notifyReservaConfirmadaCliente({
      to: parsed.data.telefono ?? "+573182293083",
      nombre_cliente: resData.nombre,
      fecha_anterior: fechaAnterior,
      fecha_nueva: fechaNueva,
      template: PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO,
      enlace_cancelar: enlaceCancelar,
      negocioId: negocioId ?? "",
    });

    devLog(
      "Resultado notif reprogramación →",
      notifReprogram.ok ? "OK" : `FAIL: ${notifReprogram.message}`
    );

    if (!notifReprogram.ok) {
      console.warn(
        "[createEditarReserva] Notificación reprogramación fallida:",
        notifReprogram.message
      );
    }
  }

  /* ------------------- RESPUESTA FINAL ------------------- */
  return {
    ok: true,
    message: id
      ? "Reserva actualizada exitosamente"
      : "Reserva creada exitosamente",
    reserva: {
      id: result.id,
      nombre: result.nombre,
      telefono: result.telefono,
      estado: result.estado,
      fechaHoraInicio: result.fechaHoraInicio.toISOString(),
      fechaHoraFin: result.fechaHoraFin?.toISOString() ?? undefined,
      notas: result.notas ?? undefined,
    },
  };
}
