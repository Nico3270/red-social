// /actions/dashboard/createEditReservasBusiness.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";

// Schema Zod para validación (alineado a BusinessAvailability, id opcional)
const schema = z.object({
  id: z.string().optional(), // Si presente, edit; sino, create
  diasAtencion: z.array(z.string().min(1)).min(1, "Selecciona al menos un día"),
  franjaMananaInicio: z.string().optional(),
  franjaMananaFin: z.string().optional(),
  franjaTardeInicio: z.string().optional(),
  franjaTardeFin: z.string().optional(),
  intervaloMinutos: z.number().int().min(5).max(120),
  capacidadPorIntervalo: z.number().int().min(1).max(50),
  duracionMinimaIntervalos: z.number().int().min(1).optional(),
  camposCustom: z.boolean(),
  negocioId: z.string().min(1, "ID de negocio requerido"), // Requerido siempre
});

// Tipo de retorno (con informacionReserva opcional)
interface Response {
  ok: boolean;
  message: string;
  informacionReserva?: z.infer<typeof schema>;
}

export async function createEditReservasBusiness(data: unknown): Promise<Response> {
  // Autenticación: Verificar usuario logueado y ownership
  const session = await auth();
  if (!session || !session.user?.id) {
    return { ok: false, message: "Usuario no autenticado" };
  }

  // Validación con Zod
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: `Datos inválidos: ${parsed.error.errors[0].message}` };
  }

  const { id, negocioId, ...configData } = parsed.data;

  try {
    // Verificar que el negocio pertenece al usuario (ownership)
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { usuarioId: true },
    });
    if (!negocio || negocio.usuarioId !== session.user.id) {
      return { ok: false, message: "No tienes permiso para modificar este negocio" };
    }

    // Transacción: Create o Edit via UPSERT (elegante y atómico)
    const result = await prisma.businessAvailability.upsert({
      where: { negocioId }, // Usa negocioId como unique key para 1:1
      update: configData, // Solo actualiza config si existe
      create: {
        ...configData,
        negocioId, // Asocia al negocio en create}
      },
    });

    return {
      ok: true,
      message: id ? "Configuración actualizada exitosamente" : "Configuración creada exitosamente",
      informacionReserva: { id: result.id, ...configData, negocioId }, // Retorna data completa
    };
  } catch (error) {
    console.error("Error en createEditReservasBusiness:", error);
    return { ok: false, message: "Error interno al procesar la configuración" };
  }
}