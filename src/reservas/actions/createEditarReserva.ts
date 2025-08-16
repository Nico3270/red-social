// /actions/dashboard/createEditarReserva.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";
import { ReservationFormData } from "../componentes/AddReservationModal";


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

interface Response {
  ok: boolean;
  message: string;
  reserva?: ReservationFormData;
}

export async function createEditarReserva(data: unknown): Promise<Response> {
  const session = await auth();
  if (!session) {
    return { ok: false, message: "Usuario no autenticado" };
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: `Datos inválidos: ${parsed.error.errors[0].message}` };
  }

  const { id, negocioId, ...resData } = parsed.data;

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
    } else {
      // Modo create: Asignar negocioId si dueño, o inferir si usuario
      const finalNegocioId = negocioId || session.user.negocioId;
      if (!finalNegocioId) {
        return { ok: false, message: "Negocio no especificado" };
      }
      result = await prisma.reservation.create({
        data: {
          ...resData,
          negocioId: finalNegocioId,
          usuarioId: session.user.id || null, // Si guest, null
        },
      });
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