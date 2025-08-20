"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { Pregunta } from "@/seed/preguntas";
import { revalidateTag } from "next/cache";

interface ResponseEditEncuesta {
  ok: boolean;
  message: string;
}

export const editarEncuestaNegocio = async (preguntas: Pregunta[]): Promise<ResponseEditEncuesta> => {
  try {
    const session = await auth();
    if (!session?.user || !session.user.negocioId) {
      return { ok: false, message: "Debes estar autenticado y tener un negocio para editar una encuesta" };
    }
    const negocioId = session.user.negocioId;
    const slugNegocio = session.user.negocioSlug || ""; // Para revalidación

    // Fetch encuesta más reciente (asumiendo edición de la principal)
    const encuesta = await prisma.encuesta.findFirst({
      where: { negocioId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!encuesta) {
      return { ok: false, message: "No se encontró encuesta para editar" };
    }

    // Validación: Filtrar preguntas sin id (aunque interfaz lo requiere, para robustez runtime)
    const validPreguntas = preguntas.filter((p) => !!p.id);
    if (validPreguntas.length !== preguntas.length) {
      return { ok: false, message: "Algunas preguntas no tienen ID válido" };
    }

    // Transacción: Borrar pivots viejos y crear nuevos
    await prisma.$transaction(async (tx) => {
      await tx.encuestaPregunta.deleteMany({ where: { encuestaId: encuesta.id } });

      await tx.encuestaPregunta.createMany({
        data: validPreguntas.map((pregunta, index) => ({
          encuestaId: encuesta.id,
          preguntaId: pregunta.id as string, // Assertion type-safe: Filtramos !!p.id arriba
          orden: index + 1,
        })),
      });
    });

    // Revalidar tag para refrescar perfil (ej. mostrar encuesta editada)
    revalidateTag(`negocio-profile-${slugNegocio}`);

    return { ok: true, message: "Encuesta editada con éxito" };
  } catch (error) {
    console.error("Error al editar encuesta:", error);
    return { ok: false, message: error instanceof Error ? error.message : "Error desconocido" };
  }
};