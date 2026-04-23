"use server"

import { buildPublicBusinessBySlugWhere } from "@/lib/business/publicBusinessVisibility";
import prisma from "@/lib/prisma";
import { TipoPregunta } from "@prisma/client";

// Interfaz actualizada para incluir id (necesario para relaciones)
export interface Pregunta {
  id: string; // Agregado para relacionar en pivot
  texto: string;
  tipo: TipoPregunta;
  creador: "ADMIN";
  requerida: true;
  categoria: string;
}

interface ResponsePreguntasNegocio {
  ok: boolean;
  message: string;
  preguntas?: Pregunta[];
  negocioId?: string;
  nombreNegocio?: string; // Opcional, si quieres mostrar nombre del negocio
}

const getPreguntasNegocio = async (slug: string): Promise<ResponsePreguntasNegocio> => {
  try {
    if (!slug) {
      return { ok: false, message: "Slug del negocio es requerido" };
    }

    // Fetch negocioId por slug (eficiente con índice en slug)
    const negocio = await prisma.negocio.findFirst({
      where: buildPublicBusinessBySlugWhere(slug),
      select: { id: true, nombre: true }, // Solo id y nombre para eficiencia
    });

    if (!negocio) {
      return { ok: false, message: "Negocio no encontrado" };
    }

    const negocioId = negocio.id;
    const nombreNegocio = negocio.nombre || "Negocio Desconocido"; // Fallback si no hay nombre

    // Fetch encuestas del negocio (todas, asumiendo múltiples; ordenadas por createdAt desc para la más reciente primero)
    const encuestas = await prisma.encuesta.findMany({
      where: { negocioId },
      select: { id: true }, // Solo id para join eficiente
      orderBy: { createdAt: "desc" },
    });

    if (encuestas.length === 0) {
      return { ok: true, message: "No hay encuestas asociadas al negocio", preguntas: [] };
    }

    // Fetch preguntas vía pivot (join en EncuestaPregunta), ordenadas por orden
    const preguntasRaw = await prisma.encuestaPregunta.findMany({
      where: { encuestaId: { in: encuestas.map((e) => e.id) } }, // Todas encuestas del negocio
      include: {
        pregunta: {
          select: { // Proyecta solo campos de interfaz Pregunta
            id: true,
            texto: true,
            tipo: true,
            creador: true,
            requerida: true,
            categoria: true,
          },
        },
      },
      orderBy: { orden: "asc" }, // Orden por pivot
    });

    // Mapear y eliminar duplicados (Set por id), casteando a interfaz (type-safe)
    const uniqueIds = new Set<string>();
    const preguntas: Pregunta[] = preguntasRaw
      .map((ep) => {
        const p = ep.pregunta;
        if (!uniqueIds.has(p.id)) {
          uniqueIds.add(p.id);
          return {
            id: p.id,
            texto: p.texto,
            tipo: p.tipo,
            creador: p.creador as "ADMIN", // Assertion: Filtramos admin en seed/query si necesario
            requerida: p.requerida as true,
            categoria: p.categoria ?? "General", // Fallback para null
          };
        }
        return null;
      })
      .filter((p): p is Pregunta => p !== null); // Type guard para non-null

    return { ok: true, message: "Preguntas obtenidas con éxito", preguntas, negocioId, nombreNegocio };
  } catch (error) {
    console.error("Error al obtener preguntas del negocio:", error);
    return { ok: false, message: error instanceof Error ? error.message : "Error desconocido" };
  }
};

export { getPreguntasNegocio };
