"use server";

import prisma from "@/lib/prisma";
import { TipoPregunta } from "@prisma/client";

interface DataRespuesta {
  preguntaId: string;
  tipo: TipoPregunta;
  valor?: string; // Para TEXTO
  calificacion?: number; // Para CALIFICABLE (1-5)
}

interface DataResena {
  negocioId: string;
  respuestas: DataRespuesta[];
  nombre?: string;
  telefono?: string;
}

interface ResponseResena {
  ok: boolean;
  message: string;
}

export const responderEncuestaNegocio = async (data: DataResena): Promise<ResponseResena> => {
  try {
    if (!data.negocioId) {
      return { ok: false, message: "ID del negocio es requerido" };
    }

    // Fetch encuesta más reciente del negocio (asumiendo una principal; ajusta si múltiple)
    const encuesta = await prisma.encuesta.findFirst({
      where: { negocioId: data.negocioId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!encuesta) {
      return { ok: false, message: "No se encontró encuesta asociada al negocio" };
    }

    // Transacción atómica: Crear Resena y Respuestas
    await prisma.$transaction(async (tx) => {
      // Crear Resena
      const resena = await tx.resena.create({
        data: {
          encuestaId: encuesta.id,
          nombre: data.nombre,
          telefono: data.telefono,
        },
      });

      // Crear Respuestas por cada
      await tx.respuesta.createMany({
        data: data.respuestas.map((r) => ({
          resenaId: resena.id,
          preguntaId: r.preguntaId,
          valor: r.tipo === "TEXTO" ? r.valor : undefined,
          calificacion: r.tipo === "CALIFICABLE" ? r.calificacion : undefined,
        })),
      });
    });

    return { ok: true, message: "Respuestas enviadas con éxito. ¡Gracias por tu feedback!" };
  } catch (error) {
    console.error("Error al responder encuesta:", error);
    return { ok: false, message: error instanceof Error ? error.message : "Error desconocido" };
  }
};