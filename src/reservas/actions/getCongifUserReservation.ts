"use server";

import prisma from "@/lib/prisma";

export interface BusinessAvailabilityData {
  id?: string;
  diasAtencion: string[];
  franjaMananaInicio?: string | null; // Permitir null para compatibilidad con Prisma
  franjaMananaFin?: string | null;
  franjaTardeInicio?: string | null;
  franjaTardeFin?: string | null;
  intervaloMinutos: number;
  capacidadPorIntervalo: number;
  duracionMinimaIntervalos?: number | null;
  camposCustom: boolean;
  negocioId: string; // Agregado correctamente
}

// Interface para respuesta
interface DataResponse {
  ok: boolean;
  message: string;
  config?: BusinessAvailabilityData;
}

export const getConfigUserReservation = async (slug: string): Promise<DataResponse> => {
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
      };
    }

    const response = await prisma.businessAvailability.findUnique({
      where: { negocioId: negocio.id },
      select: {
        id: true,
        diasAtencion: true,
        franjaMananaInicio: true,
        franjaMananaFin: true,
        franjaTardeInicio: true,
        franjaTardeFin: true,
        intervaloMinutos: true,
        capacidadPorIntervalo: true,
        duracionMinimaIntervalos: true,
        camposCustom: true,
      },
    });

    if (!response) {
      return {
        ok: true,
        message: "No se encontró configuración de reservas para este negocio. Puedes crear una nueva.",
        config: undefined,
      };
    }

    // Mapeo para consistencia: Convertir null a undefined (opcional, pero limpia para frontend)
    const configData: BusinessAvailabilityData = {
      id: response.id,
      diasAtencion: response.diasAtencion,
      franjaMananaInicio: response.franjaMananaInicio ?? undefined,
      franjaMananaFin: response.franjaMananaFin ?? undefined,
      franjaTardeInicio: response.franjaTardeInicio ?? undefined,
      franjaTardeFin: response.franjaTardeFin ?? undefined,
      intervaloMinutos: response.intervaloMinutos,
      capacidadPorIntervalo: response.capacidadPorIntervalo,
      duracionMinimaIntervalos: response.duracionMinimaIntervalos ?? undefined,
      camposCustom: response.camposCustom,
      negocioId: negocio.id,
    };

    return {
      ok: true,
      message: "Configuración de reservas obtenida exitosamente",
      config: configData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al obtener configuración de reservas:", { errorMessage, slug }); // Logging estructurado para depuración
    return {
      ok: false,
      message: "Error interno al consultar la configuración. Intenta nuevamente.",
    };
  }
};