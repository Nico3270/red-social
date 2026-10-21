"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { rotateReservationCapabilityInTx } from "@/reservas/lib/reservation-capability";
import { ReservationStatus, Role } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import * as z from "zod";

const RESERVATION_TIME_ZONE = "America/Bogota";

const dateInputSchema = z.union([z.string(), z.date()]);
const ownerReservationSchema = z
  .object({
    nombre: z.string().trim().min(3),
    telefono: z.string().trim().min(1),
    fechaHoraInicio: dateInputSchema,
    fechaHoraFin: dateInputSchema.nullable(),
    notas: z.string().trim().nullable().optional(),
    estado: z
      .enum([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])
      .optional(),
  })
  .strict();

type OwnerReservationErrorCode =
  | "UNAUTHENTICATED"
  | "RESERVATION_ACCESS_DENIED"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR";

type OwnerReservationResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: OwnerReservationErrorCode;
      message: string;
    };

type NormalizedOwnerReservationInput = {
  nombre: string;
  telefono: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
  notas: string | null;
  estado: ReservationStatus;
};

type CommittedOwnerReservation = {
  negocioId: string;
  reservation: {
    id: string;
    nombre: string;
    telefono: string;
    fechaHoraInicio: Date;
    fechaHoraFin: Date | null;
    notas: string | null;
  };
  capabilityToken: string;
};

class OwnerReservationAccessError extends Error {
  constructor() {
    super("Owner reservation access denied.");
    this.name = "OwnerReservationAccessError";
  }
}

const ERROR_RESPONSES = {
  UNAUTHENTICATED: {
    ok: false,
    code: "UNAUTHENTICATED",
    message: "Debes iniciar sesión para realizar esta acción.",
  },
  RESERVATION_ACCESS_DENIED: {
    ok: false,
    code: "RESERVATION_ACCESS_DENIED",
    message: "No tienes permiso para realizar esta acción.",
  },
  INVALID_INPUT: {
    ok: false,
    code: "INVALID_INPUT",
    message: "Los datos de la reserva no son válidos.",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible crear la reserva.",
  },
} as const satisfies Record<OwnerReservationErrorCode, OwnerReservationResult>;

function isProductionLoopback(hostname: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]"
  );
}

function getCanonicalSiteOrigin(): string | null {
  const raw = process.env.SITE_URL;
  if (!raw || raw !== raw.trim()) return null;

  try {
    const siteUrl = new URL(raw);

    if (
      (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") ||
      siteUrl.username ||
      siteUrl.password ||
      siteUrl.search ||
      siteUrl.hash ||
      siteUrl.pathname !== "/" ||
      isProductionLoopback(siteUrl.hostname)
    ) {
      return null;
    }

    return siteUrl.origin;
  } catch {
    return null;
  }
}

function parseDateInput(value: string | Date): Date | null {
  if (
    typeof value === "string" &&
    !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim())
  ) {
    return null;
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const normalizedDigits = digits.length === 10 ? `57${digits}` : digits;
  const normalized = `+${normalizedDigits}`;

  return /^\+\d{10,15}$/.test(normalized) ? normalized : null;
}

function normalizeInput(data: unknown): NormalizedOwnerReservationInput | null {
  const parsed = ownerReservationSchema.safeParse(data);
  if (!parsed.success) return null;

  const fechaHoraInicio = parseDateInput(parsed.data.fechaHoraInicio);
  const fechaHoraFin =
    parsed.data.fechaHoraFin === null
      ? null
      : parseDateInput(parsed.data.fechaHoraFin);
  const telefono = normalizePhone(parsed.data.telefono);

  if (
    !fechaHoraInicio ||
    (parsed.data.fechaHoraFin !== null && !fechaHoraFin) ||
    (fechaHoraFin && fechaHoraInicio >= fechaHoraFin) ||
    !telefono
  ) {
    return null;
  }

  return {
    nombre: parsed.data.nombre,
    telefono,
    fechaHoraInicio,
    fechaHoraFin,
    notas: parsed.data.notas?.trim() || null,
    estado: parsed.data.estado ?? ReservationStatus.PENDIENTE,
  };
}

function formatReservationDate(date: Date): string {
  return formatInTimeZone(
    date,
    RESERVATION_TIME_ZONE,
    "d 'de' MMMM 'de' yyyy 'a las' h:mm a",
    { locale: es },
  );
}

async function notifyWithoutChangingCommittedResult(
  input: Parameters<typeof notifyReservaConfirmadaCliente>[0],
): Promise<void> {
  try {
    await notifyReservaConfirmadaCliente(input);
  } catch {
    // La reserva y su capability ya fueron confirmadas por la transacción.
  }
}

export async function createOwnerReservation(
  data: unknown,
): Promise<OwnerReservationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return ERROR_RESPONSES.UNAUTHENTICATED;
  }

  const ownerBusinessId =
    typeof session.user.negocioId === "string"
      ? session.user.negocioId.trim()
      : "";
  if (session.user.role !== Role.negocio || !ownerBusinessId) {
    return ERROR_RESPONSES.RESERVATION_ACCESS_DENIED;
  }

  const normalized = normalizeInput(data);
  if (!normalized) {
    return ERROR_RESPONSES.INVALID_INPUT;
  }

  const siteOrigin = getCanonicalSiteOrigin();
  if (!siteOrigin) {
    return ERROR_RESPONSES.INTERNAL_ERROR;
  }

  let committed: CommittedOwnerReservation;

  try {
    committed = await prisma.$transaction(async (tx) => {
      const negocio = await tx.negocio.findUnique({
        where: { id: ownerBusinessId },
        select: { id: true },
      });

      if (!negocio) {
        throw new OwnerReservationAccessError();
      }

      const reservation = await tx.reservation.create({
        data: {
          negocioId: negocio.id,
          usuarioId: null,
          nombre: normalized.nombre,
          telefono: normalized.telefono,
          fechaHoraInicio: normalized.fechaHoraInicio,
          fechaHoraFin: normalized.fechaHoraFin,
          notas: normalized.notas,
          estado: normalized.estado,
        },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          fechaHoraInicio: true,
          fechaHoraFin: true,
          notas: true,
        },
      });

      const capability = await rotateReservationCapabilityInTx(tx, {
        reservationId: reservation.id,
        fechaHoraInicio: reservation.fechaHoraInicio,
        fechaHoraFin: reservation.fechaHoraFin,
      });

      return {
        negocioId: negocio.id,
        reservation,
        capabilityToken: capability.token,
      };
    });
  } catch (error) {
    if (error instanceof OwnerReservationAccessError) {
      return ERROR_RESPONSES.RESERVATION_ACCESS_DENIED;
    }

    return ERROR_RESPONSES.INTERNAL_ERROR;
  }

  const managementLink = new URL(
    `/reservas/gestionar/${encodeURIComponent(committed.capabilityToken)}`,
    siteOrigin,
  ).toString();

  await notifyWithoutChangingCommittedResult({
    to: committed.reservation.telefono,
    nombre_cliente: committed.reservation.nombre,
    fechaHora: formatReservationDate(committed.reservation.fechaHoraInicio),
    enlace_cancelar: managementLink,
    descripcion: committed.reservation.notas ?? "",
    template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
    negocioId: committed.negocioId,
  });

  return {
    ok: true,
    message: "Reserva creada exitosamente.",
  };
}
