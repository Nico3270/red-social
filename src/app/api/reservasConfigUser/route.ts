import { ReservationStatus } from "@prisma/client";
import { endOfDay, isMatch, isValid, parseISO, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { buildPublishedBusinessWhere } from "@/lib/business/business-visibility-policy";
import prisma from "@/lib/prisma";

type OccupancySlot = {
  start: string;
  end?: string;
  count: number;
  blocked: boolean;
};

type OccupancyResponse = {
  ok: true;
  date: string;
  occupancy: OccupancySlot[];
};

type ErrorResponse = {
  ok: false;
  code?: "BUSINESS_NOT_AVAILABLE";
  message: string;
};

const BUSINESS_NOT_AVAILABLE: ErrorResponse = {
  ok: false,
  code: "BUSINESS_NOT_AVAILABLE",
  message: "Este negocio no está disponible para esta acción.",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const negocioId = searchParams.get("negocioId");

  if (!dateStr || !negocioId) {
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        message:
          "Parámetros requeridos: ?date=YYYY-MM-DD&negocioId=ID_DEL_NEGOCIO",
      },
      { status: 400 }
    );
  }

  const normalizedNegocioId = negocioId.trim();
  const date = parseISO(dateStr);

  if (
    !normalizedNegocioId ||
    !isMatch(dateStr, "yyyy-MM-dd") ||
    !isValid(date)
  ) {
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        message: "Parámetros inválidos. Usa date=YYYY-MM-DD y un negocioId válido.",
      },
      { status: 400 }
    );
  }

  try {
    const negocio = await prisma.negocio.findFirst({
      where: {
        AND: [
          buildPublishedBusinessWhere(),
          { id: normalizedNegocioId },
        ],
      },
      select: { id: true },
    });

    if (!negocio) {
      return NextResponse.json<ErrorResponse>(BUSINESS_NOT_AVAILABLE, {
        status: 409,
      });
    }

    const rangeStart = startOfDay(date);
    const rangeEnd = endOfDay(date);
    const reservations = await prisma.reservation.findMany({
      where: {
        negocioId: negocio.id,
        fechaHoraInicio: {
          gte: rangeStart,
          lt: rangeEnd,
        },
        estado: {
          in: [
            ReservationStatus.PENDIENTE,
            ReservationStatus.CONFIRMADA,
            ReservationStatus.BLOQUEADA,
          ],
        },
      },
      select: {
        fechaHoraInicio: true,
        fechaHoraFin: true,
        estado: true,
      },
    });

    const occupancyByRange = new Map<string, OccupancySlot>();

    for (const reservation of reservations) {
      if (
        reservation.estado === ReservationStatus.CANCELADA ||
        reservation.estado === ReservationStatus.COMPLETADA
      ) {
        continue;
      }

      const start = reservation.fechaHoraInicio.toISOString();
      const end = reservation.fechaHoraFin?.toISOString();
      const key = `${start}\u0000${end ?? ""}`;
      const current = occupancyByRange.get(key) ?? {
        start,
        ...(end ? { end } : {}),
        count: 0,
        blocked: false,
      };

      if (reservation.estado === ReservationStatus.BLOQUEADA) {
        current.blocked = true;
      } else {
        current.count += 1;
      }

      occupancyByRange.set(key, current);
    }

    const occupancy = Array.from(occupancyByRange.values()).sort(
      (left, right) =>
        left.start.localeCompare(right.start) ||
        (left.end ?? "").localeCompare(right.end ?? "")
    );

    return NextResponse.json<OccupancyResponse>({
      ok: true,
      date: dateStr,
      occupancy,
    });
  } catch {
    console.error("Error al consultar disponibilidad pública de reservas");
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        message: "Error interno al consultar disponibilidad",
      },
      { status: 500 }
    );
  }
}
