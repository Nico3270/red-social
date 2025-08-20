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

interface PreguntasAdmin {
  ok: boolean;
  message: string;
  preguntas?: Pregunta[];
}

export const getPreguntasAdmin = async (): Promise<PreguntasAdmin> => {
  try {
    // Fetch todas las preguntas (eficiente con índices en creador/createdAt si aplican)
    const response = await prisma.pregunta.findMany({
      where: { creador: "ADMIN" }, // Filtra solo admin para alinearnos con la interfaz y visión (preguntas fijas reutilizables)
      select: { // Proyecta solo campos necesarios para optimizar query y evitar extras
        texto: true,
        tipo: true,
        creador: true,
        requerida: true,
        categoria: true,
        id: true
      },
    });

    if (!response || response.length === 0) {
      return { ok: false, message: "No se encontraron preguntas admin disponibles" };
    }

    // Mapeo explícito a interfaz Pregunta (castea creador para type-safety, ya filtrado)
    const mappedPreguntas: Pregunta[] = response.map((p) => ({
      texto: p.texto,
      tipo: p.tipo,
      creador: p.creador as "ADMIN", // Assertion segura: ya filtramos por "ADMIN"
      requerida: p.requerida as true, // Assertion: asumimos true en admin, pero valida si varía
      categoria: p.categoria ?? "General", // Fallback si null, para robustez
      id: p.id // Asegura que id esté presente para relaciones pivot
    }));

    return { ok: true, message: "Preguntas obtenidas con éxito", preguntas: mappedPreguntas };
  } catch (error) {
    console.error("Error en getPreguntasAdmin:", error);
    return { ok: false, message: error instanceof Error ? error.message : "Error desconocido" };
  }
};