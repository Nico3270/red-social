"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { rotateReservationCapabilityInTx } from "@/reservas/lib/reservation-capability";
import { Prisma, ReservationStatus, Role } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import * as z from "zod";

const RESERVATION_TIME_ZONE = "America/Bogota";
const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

const dateInputSchema = z.union([z.string(), z.date()]);
const updateOwnerReservationSchema = z
  .object({
    id: z.string().trim().min(1),
    nombre: z.string().trim().min(3),
    telefono: z.string().trim().min(1),
    fechaHoraInicio: dateInputSchema,
    fechaHoraFin: dateInputSchema.nullable(),
    notas: z.string().trim().nullable().optional(),
  })
  .strict();

type UpdateOwnerReservationErrorCode =
  | "UNAUTHENTICATED"
  | "RESERVATION_ACCESS_DENIED"
  | "RESERVATION_NOT_AVAILABLE"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR";

type UpdateOwnerReservationResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: UpdateOwnerReservationErrorCode;
      message: string;
    };

type NormalizedUpdateOwnerReservationInput = {
  id: string;
  nombre: string;
  telefono: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
  notas: string | null;
};

type ExistingReservation = {
  id: string;
  estado: ReservationStatus;
  nombre: string;
  telefono: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
  notas: string | null;
};

type CommittedOwnerReservationUpdate = {
  negocioId: string;
  previous: {
    fechaHoraInicio: Date;
    fechaHoraFin: Date | null;
  };
  reservation: {
    id: string;
    nombre: string;
    telefono: string;
    fechaHoraInicio: Date;
    fechaHoraFin: Date | null;
    notas: string | null;
  };
  rotation: {
    token: string;
    scheduleChanged: boolean;
    phoneChanged: boolean;
  } | null;
};

class OwnerReservationBoundaryError extends Error {
  readonly code: "RESERVATION_ACCESS_DENIED" | "RESERVATION_NOT_AVAILABLE";

  constructor(code: "RESERVATION_ACCESS_DENIED" | "RESERVATION_NOT_AVAILABLE") {
    super("Owner reservation update failed.");
    this.name = "OwnerReservationBoundaryError";
    this.code = code;
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
  RESERVATION_NOT_AVAILABLE: {
    ok: false,
    code: "RESERVATION_NOT_AVAILABLE",
    message: "La reserva no está disponible para esta acción.",
  },
  INVALID_INPUT: {
    ok: false,
    code: "INVALID_INPUT",
    message: "Los datos de la reserva no son válidos.",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible actualizar la reserva.",
  },
} as const satisfies Record<
  UpdateOwnerReservationErrorCode,
  UpdateOwnerReservationResult
>;

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

function normalizeInput(
  data: unknown,
): NormalizedUpdateOwnerReservationInput | null {
  const parsed = updateOwnerReservationSchema.safeParse(data);
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
    id: parsed.data.id,
    nombre: parsed.data.nombre,
    telefono,
    fechaHoraInicio,
    fechaHoraFin,
    notas: parsed.data.notas?.trim() || null,
  };
}

function isEditableStatus(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.PENDIENTE ||
    status === ReservationStatus.CONFIRMADA
  );
}

function datesEqual(left: Date | null, right: Date | null): boolean {
  if (left === null || right === null) return left === right;
  return left.getTime() === right.getTime();
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function updateWithinSerializableTransaction(
  input: NormalizedUpdateOwnerReservationInput,
  ownerBusinessId: string,
): Promise<CommittedOwnerReservationUpdate> {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = (await tx.reservation.findFirst({
            where: {
              id: input.id,
              negocioId: ownerBusinessId,
            },
            select: {
              id: true,
              estado: true,
              nombre: true,
              telefono: true,
              fechaHoraInicio: true,
              fechaHoraFin: true,
              notas: true,
            },
          })) as ExistingReservation | null;

          if (!existing) {
            throw new OwnerReservationBoundaryError(
              "RESERVATION_ACCESS_DENIED",
            );
          }

          if (!isEditableStatus(existing.estado)) {
            throw new OwnerReservationBoundaryError(
              "RESERVATION_NOT_AVAILABLE",
            );
          }

          const startChanged =
            existing.fechaHoraInicio.getTime() !==
            input.fechaHoraInicio.getTime();
          const endChanged = !datesEqual(
            existing.fechaHoraFin,
            input.fechaHoraFin,
          );
          const normalizedExistingPhone =
            normalizePhone(existing.telefono) ?? existing.telefono.trim();
          const phoneChanged = normalizedExistingPhone !== input.telefono;
          const scheduleChanged = startChanged || endChanged;

          const reservation = await tx.reservation.update({
            where: {
              id: existing.id,
            },
            data: {
              nombre: input.nombre,
              telefono: input.telefono,
              fechaHoraInicio: input.fechaHoraInicio,
              fechaHoraFin: input.fechaHoraFin,
              notas: input.notas,
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

          if (!scheduleChanged && !phoneChanged) {
            return {
              negocioId: ownerBusinessId,
              previous: {
                fechaHoraInicio: existing.fechaHoraInicio,
                fechaHoraFin: existing.fechaHoraFin,
              },
              reservation,
              rotation: null,
            };
          }

          const capability = await rotateReservationCapabilityInTx(tx, {
            reservationId: reservation.id,
            fechaHoraInicio: reservation.fechaHoraInicio,
            fechaHoraFin: reservation.fechaHoraFin,
          });

          return {
            negocioId: ownerBusinessId,
            previous: {
              fechaHoraInicio: existing.fechaHoraInicio,
              fechaHoraFin: existing.fechaHoraFin,
            },
            reservation,
            rotation: {
              token: capability.token,
              scheduleChanged,
              phoneChanged,
            },
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        isSerializableConflict(error) &&
        attempt < SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Owner reservation update retry invariant failed.");
}

function formatReservationInstant(date: Date): string {
  return formatInTimeZone(
    date,
    RESERVATION_TIME_ZONE,
    "d 'de' MMMM 'de' yyyy 'a las' h:mm a",
    { locale: es },
  );
}

function formatReservationSchedule(start: Date, end: Date | null): string {
  const formattedStart = formatReservationInstant(start);
  return end
    ? `${formattedStart} - ${formatReservationInstant(end)}`
    : formattedStart;
}

async function notifyWithoutChangingCommittedResult(
  input: Parameters<typeof notifyReservaConfirmadaCliente>[0],
): Promise<void> {
  try {
    await notifyReservaConfirmadaCliente(input);
  } catch {
    // La actualización y su capability ya fueron confirmadas por la transacción.
  }
}

export async function updateOwnerReservation(
  data: unknown,
): Promise<UpdateOwnerReservationResult> {
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

  let committed: CommittedOwnerReservationUpdate;
  try {
    committed = await updateWithinSerializableTransaction(
      normalized,
      ownerBusinessId,
    );
  } catch (error) {
    if (error instanceof OwnerReservationBoundaryError) {
      return ERROR_RESPONSES[error.code];
    }

    return ERROR_RESPONSES.INTERNAL_ERROR;
  }

  if (committed.rotation) {
    const managementLink = new URL(
      `/reservas/gestionar/${encodeURIComponent(committed.rotation.token)}`,
      siteOrigin,
    ).toString();

    if (committed.rotation.scheduleChanged) {
      await notifyWithoutChangingCommittedResult({
        to: committed.reservation.telefono,
        nombre_cliente: committed.reservation.nombre,
        fecha_anterior: formatReservationSchedule(
          committed.previous.fechaHoraInicio,
          committed.previous.fechaHoraFin,
        ),
        fecha_nueva: formatReservationSchedule(
          committed.reservation.fechaHoraInicio,
          committed.reservation.fechaHoraFin,
        ),
        enlace_cancelar: managementLink,
        template: PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO,
        negocioId: committed.negocioId,
      });
    } else {
      await notifyWithoutChangingCommittedResult({
        to: committed.reservation.telefono,
        nombre_cliente: committed.reservation.nombre,
        fechaHora: formatReservationSchedule(
          committed.reservation.fechaHoraInicio,
          committed.reservation.fechaHoraFin,
        ),
        enlace_cancelar: managementLink,
        descripcion: committed.reservation.notas ?? "",
        template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
        negocioId: committed.negocioId,
      });
    }
  }

  return {
    ok: true,
    message: "Reserva actualizada exitosamente.",
  };
}
