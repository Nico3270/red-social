"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { BusinessAvailabilityData } from "../componentes/CrearReservasForm";

// Interface para respuesta (ya definida, pero incluyo para contexto)
interface DataResponse {
  ok: boolean;
  message: string;
  config?: BusinessAvailabilityData;
}


export const getconfigReservation = async (): Promise<DataResponse> => {
  const session = await auth();
  if (!session || !session.user?.negocioId) {
    return {
      ok: false,
      message: "El usuario no está autenticado o no tiene un negocio asociado",
    };
  }

  const negocioId = session.user.negocioId;

  try {
    const response = await prisma.businessAvailability.findUnique({
      where: { negocioId },
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

    return {
      ok: true,
      message: "Configuración de reservas obtenida exitosamente",
      config: response as BusinessAvailabilityData,
    };
  } catch (error) {
    console.error("Error al obtener configuración de reservas:", error);
    return {
      ok: false,
      message: "Error interno al consultar la configuración. Intenta nuevamente.",
    };
  }
};