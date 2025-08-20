"use server"

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { TipoPregunta } from "@prisma/client";
import { revalidateTag } from "next/cache";


// Interfaz actualizada para incluir id (necesario para relaciones)
export interface Pregunta {
  id: string; // Agregado para relacionar en pivot
  texto: string;
  tipo: TipoPregunta;
  creador: "ADMIN";
  requerida: true;
  categoria: string;
}

interface ResponseCreateEncuesta {
  ok: boolean;
  message: string;
}

export const createEncuestaNegocio = async (preguntas?: Pregunta[]): Promise<ResponseCreateEncuesta> => {
  const session = await auth();
  if (!session?.user || !session.user.negocioId) {
    return { ok: false, message: "Debes estar autenticado y tener un negocio para crear una encuesta" };
  }
  const negocioId = session.user.negocioId;
  const nombreNegocio = session.user.negocioNombre || "Negocio Desconocido"; // Fallback si no hay nombre
  const slugNegocio = session.user.negocioSlug || ""; // Fallback si no hay slug

  try {
    // Validación básica: Si preguntas vacías, advertir pero permitir (encuesta base)
    if (!preguntas || preguntas.length === 0) {
      return { ok: false, message: "Debes seleccionar al menos una pregunta para crear la encuesta" }; // Opcional: Cambia a permitir vacías si prefieres
    }

    // Transacción atómica: Crear encuesta y relacionar preguntas
    const nuevaEncuesta = await prisma.$transaction(async (tx) => {
      // Crear la encuesta asociada al negocio
      const encuesta = await tx.encuesta.create({
        data: {
          negocioId,
          titulo: `Encuesta para negocio: ${nombreNegocio}`, // Default; puedes pasar como param si expandes
          descripcion: `Encuesta creada para recopilar feedback de clientes del negocio ${nombreNegocio} .`, // Default
        },
      });

      // Crear relaciones pivot para cada pregunta (con orden secuencial)
      await tx.encuestaPregunta.createMany({
        data: preguntas.map((pregunta, index) => ({
          encuestaId: encuesta.id,
          preguntaId: pregunta.id, // Usa id de la pregunta seleccionada
          orden: index + 1, // Orden basado en array (1-based)
        })),
      });

      return encuesta;
    });
    revalidateTag(`negocio-profile-${slugNegocio}`);

    return { ok: true, message: `Encuesta creada con éxito con ID: ${nuevaEncuesta.id}. Preguntas relacionadas: ${preguntas.length}` };
  } catch (error) {
    console.error("Error en createEncuestaNegocio:", error);
    return { ok: false, message: error instanceof Error ? error.message : "Error desconocido al crear la encuesta" };
  }
};