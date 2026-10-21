"use server";

import { auth } from "@/auth.config";
import { buildPublishedBusinessWhere } from "@/lib/business/business-visibility-policy";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { rotateReservationCapabilityInTx } from "@/reservas/lib/reservation-capability";
import { Prisma, ReservationStatus } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import * as z from "zod";

const RESERVATION_TIME_ZONE = "America/Bogota";
const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

const dateInputSchema = z.union([z.string(), z.date()]);
const publicReservationSchema = z
  .object({
    slug: z.string().trim().min(1),
    nombre: z.string().trim().min(3),
    telefono: z.string().trim().min(1),
    fechaHoraInicio: dateInputSchema,
    fechaHoraFin: dateInputSchema.nullable(),
    notas: z.string().trim().nullable().optional(),
  })
  .strict();

type PublicReservationErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_INPUT"
  | "BUSINESS_NOT_AVAILABLE"
  | "RESERVATION_NOT_AVAILABLE"
  | "INTERNAL_ERROR";

type PublicReservationResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: PublicReservationErrorCode;
      message: string;
    };

type NormalizedPublicReservationInput = {
  slug: string;
  nombre: string;
  telefono: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
  notas: string | null;
};

type AvailabilityConfig = {
  diasAtencion: string[];
  franjaMananaInicio: string | null;
  franjaMananaFin: string | null;
  franjaTardeInicio: string | null;
  franjaTardeFin: string | null;
  intervaloMinutos: number;
  capacidadPorIntervalo: number;
  duracionMinimaIntervalos: number | null;
};

type AvailabilityRange = {
  startMinutes: number;
  endMinutes: number;
};

type OccupancyRow = {
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
  estado: ReservationStatus;
};

class PublicReservationBoundaryError extends Error {
  readonly code: "BUSINESS_NOT_AVAILABLE" | "RESERVATION_NOT_AVAILABLE";

  constructor(code: "BUSINESS_NOT_AVAILABLE" | "RESERVATION_NOT_AVAILABLE") {
    super("Public reservation operation failed.");
    this.name = "PublicReservationBoundaryError";
    this.code = code;
  }
}

const ERROR_RESPONSES = {
  UNAUTHENTICATED: {
    ok: false,
    code: "UNAUTHENTICATED",
    message: "Debes iniciar sesión para realizar esta acción.",
  },
  INVALID_INPUT: {
    ok: false,
    code: "INVALID_INPUT",
    message: "Los datos de la reserva no son válidos.",
  },
  BUSINESS_NOT_AVAILABLE: {
    ok: false,
    code: "BUSINESS_NOT_AVAILABLE",
    message: "Este negocio no está disponible para esta acción.",
  },
  RESERVATION_NOT_AVAILABLE: {
    ok: false,
    code: "RESERVATION_NOT_AVAILABLE",
    message: "La reserva no está disponible para el horario seleccionado.",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible crear la reserva.",
  },
} as const satisfies Record<
  PublicReservationErrorCode,
  PublicReservationResult
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
):
  | { ok: true; value: NormalizedPublicReservationInput }
  | { ok: false; dateError: boolean } {
  const parsed = publicReservationSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, dateError: false };
  }

  const fechaHoraInicio = parseDateInput(parsed.data.fechaHoraInicio);
  const fechaHoraFin =
    parsed.data.fechaHoraFin === null
      ? null
      : parseDateInput(parsed.data.fechaHoraFin);

  if (
    !fechaHoraInicio ||
    (parsed.data.fechaHoraFin !== null && !fechaHoraFin) ||
    (fechaHoraFin && fechaHoraInicio >= fechaHoraFin)
  ) {
    return { ok: false, dateError: true };
  }

  const telefono = normalizePhone(parsed.data.telefono);
  if (!telefono) {
    return { ok: false, dateError: false };
  }

  return {
    ok: true,
    value: {
      slug: parsed.data.slug,
      nombre: parsed.data.nombre,
      telefono,
      fechaHoraInicio,
      fechaHoraFin,
      notas: parsed.data.notas?.trim() || null,
    },
  };
}

function clockToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function availabilityRanges(
  config: AvailabilityConfig,
): AvailabilityRange[] | null {
  const rawRanges = [
    [config.franjaMananaInicio, config.franjaMananaFin],
    [config.franjaTardeInicio, config.franjaTardeFin],
  ] as const;
  const ranges: AvailabilityRange[] = [];

  for (const [rawStart, rawEnd] of rawRanges) {
    if (rawStart === null && rawEnd === null) continue;
    if (rawStart === null || rawEnd === null) return null;

    const startMinutes = clockToMinutes(rawStart);
    const endMinutes = clockToMinutes(rawEnd);
    if (
      startMinutes === null ||
      endMinutes === null ||
      endMinutes <= startMinutes
    ) {
      return null;
    }

    ranges.push({ startMinutes, endMinutes });
  }

  return ranges.length > 0 ? ranges : null;
}

function bogotaDayName(date: Date): string {
  const dayName = formatInTimeZone(date, RESERVATION_TIME_ZONE, "EEEE", {
    locale: es,
  });
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

function bogotaMinuteOfDay(date: Date): number {
  const hours = Number(formatInTimeZone(date, RESERVATION_TIME_ZONE, "HH"));
  const minutes = Number(formatInTimeZone(date, RESERVATION_TIME_ZONE, "mm"));
  return hours * 60 + minutes;
}

function validateSchedule(
  input: NormalizedPublicReservationInput,
  config: AvailabilityConfig,
  now: Date,
): { end: Date; intervalMilliseconds: number } {
  const minimumIntervals = config.duracionMinimaIntervalos ?? 1;
  if (
    !Number.isSafeInteger(config.intervaloMinutos) ||
    config.intervaloMinutos <= 0 ||
    !Number.isSafeInteger(config.capacidadPorIntervalo) ||
    config.capacidadPorIntervalo <= 0 ||
    !Number.isSafeInteger(minimumIntervals) ||
    minimumIntervals <= 0 ||
    input.fechaHoraInicio <= now
  ) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const intervalMilliseconds = config.intervaloMinutos * 60_000;
  const minimumDurationMilliseconds = intervalMilliseconds * minimumIntervals;
  if (!Number.isSafeInteger(minimumDurationMilliseconds)) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const end =
    input.fechaHoraFin ??
    new Date(input.fechaHoraInicio.getTime() + minimumDurationMilliseconds);

  if (
    !Number.isFinite(end.getTime()) ||
    end <= input.fechaHoraInicio ||
    formatInTimeZone(
      input.fechaHoraInicio,
      RESERVATION_TIME_ZONE,
      "yyyy-MM-dd",
    ) !== formatInTimeZone(end, RESERVATION_TIME_ZONE, "yyyy-MM-dd") ||
    input.fechaHoraInicio.getUTCSeconds() !== 0 ||
    input.fechaHoraInicio.getUTCMilliseconds() !== 0
  ) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  if (!config.diasAtencion.includes(bogotaDayName(input.fechaHoraInicio))) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const ranges = availabilityRanges(config);
  if (!ranges) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const startMinutes = bogotaMinuteOfDay(input.fechaHoraInicio);
  const endMinutes = bogotaMinuteOfDay(end);
  const matchingRange = ranges.find(
    (range) =>
      startMinutes >= range.startMinutes && endMinutes <= range.endMinutes,
  );
  const durationMilliseconds = end.getTime() - input.fechaHoraInicio.getTime();

  if (
    !matchingRange ||
    (startMinutes - matchingRange.startMinutes) % config.intervaloMinutos !==
      0 ||
    durationMilliseconds % intervalMilliseconds !== 0 ||
    durationMilliseconds < minimumDurationMilliseconds
  ) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  return { end, intervalMilliseconds };
}

function overlaps(
  row: OccupancyRow,
  intervalStart: Date,
  intervalEnd: Date,
): boolean {
  if (row.fechaHoraFin) {
    return (
      row.fechaHoraInicio < intervalEnd && row.fechaHoraFin > intervalStart
    );
  }

  return (
    row.fechaHoraInicio >= intervalStart && row.fechaHoraInicio < intervalEnd
  );
}

function assertAvailability(
  rows: OccupancyRow[],
  start: Date,
  end: Date,
  intervalMilliseconds: number,
  capacity: number,
): void {
  const blocked = rows.some(
    (row) =>
      row.estado === ReservationStatus.BLOQUEADA && overlaps(row, start, end),
  );
  if (blocked) {
    throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  for (
    let intervalStartMs = start.getTime();
    intervalStartMs < end.getTime();
    intervalStartMs += intervalMilliseconds
  ) {
    const intervalStart = new Date(intervalStartMs);
    const intervalEnd = new Date(intervalStartMs + intervalMilliseconds);
    const count = rows.reduce((total, row) => {
      const consumesCapacity =
        row.estado === ReservationStatus.PENDIENTE ||
        row.estado === ReservationStatus.CONFIRMADA;
      return consumesCapacity && overlaps(row, intervalStart, intervalEnd)
        ? total + 1
        : total;
    }, 0);

    if (count >= capacity) {
      throw new PublicReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
    }
  }
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function createWithinSerializableTransaction(
  input: NormalizedPublicReservationInput,
  userId: string,
) {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const negocio = await tx.negocio.findFirst({
            where: {
              AND: [buildPublishedBusinessWhere(), { slug: input.slug }],
            },
            select: {
              id: true,
              telefonoContacto: true,
              availability: {
                select: {
                  diasAtencion: true,
                  franjaMananaInicio: true,
                  franjaMananaFin: true,
                  franjaTardeInicio: true,
                  franjaTardeFin: true,
                  intervaloMinutos: true,
                  capacidadPorIntervalo: true,
                  duracionMinimaIntervalos: true,
                },
              },
            },
          });

          if (!negocio) {
            throw new PublicReservationBoundaryError("BUSINESS_NOT_AVAILABLE");
          }

          if (!negocio.availability) {
            throw new PublicReservationBoundaryError(
              "RESERVATION_NOT_AVAILABLE",
            );
          }

          const { end, intervalMilliseconds } = validateSchedule(
            input,
            negocio.availability,
            new Date(),
          );
          const occupancyRows = await tx.reservation.findMany({
            where: {
              negocioId: negocio.id,
              estado: {
                in: [
                  ReservationStatus.PENDIENTE,
                  ReservationStatus.CONFIRMADA,
                  ReservationStatus.BLOQUEADA,
                ],
              },
              fechaHoraInicio: {
                lt: end,
              },
              OR: [
                {
                  fechaHoraFin: {
                    gt: input.fechaHoraInicio,
                  },
                },
                {
                  fechaHoraFin: null,
                  fechaHoraInicio: {
                    gte: input.fechaHoraInicio,
                  },
                },
              ],
            },
            select: {
              fechaHoraInicio: true,
              fechaHoraFin: true,
              estado: true,
            },
          });

          assertAvailability(
            occupancyRows,
            input.fechaHoraInicio,
            end,
            intervalMilliseconds,
            negocio.availability.capacidadPorIntervalo,
          );

          const reservation = await tx.reservation.create({
            data: {
              negocioId: negocio.id,
              usuarioId: userId,
              nombre: input.nombre,
              telefono: input.telefono,
              fechaHoraInicio: input.fechaHoraInicio,
              fechaHoraFin: end,
              notas: input.notas,
              estado: ReservationStatus.PENDIENTE,
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
            negocio: {
              id: negocio.id,
              telefonoContacto: negocio.telefonoContacto,
            },
            reservation,
            capabilityToken: capability.token,
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

  throw new Error("Public reservation retry invariant failed.");
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

export async function createPublicReservation(
  data: unknown,
): Promise<PublicReservationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return ERROR_RESPONSES.UNAUTHENTICATED;
  }

  const normalized = normalizeInput(data);
  if (!normalized.ok) {
    return normalized.dateError
      ? ERROR_RESPONSES.RESERVATION_NOT_AVAILABLE
      : ERROR_RESPONSES.INVALID_INPUT;
  }

  const siteOrigin = getCanonicalSiteOrigin();
  if (!siteOrigin) {
    return ERROR_RESPONSES.INTERNAL_ERROR;
  }

  let committed: Awaited<
    ReturnType<typeof createWithinSerializableTransaction>
  >;
  try {
    committed = await createWithinSerializableTransaction(
      normalized.value,
      session.user.id,
    );
  } catch (error) {
    if (error instanceof PublicReservationBoundaryError) {
      return ERROR_RESPONSES[error.code];
    }

    return ERROR_RESPONSES.INTERNAL_ERROR;
  }

  const fechaHora = formatReservationDate(
    committed.reservation.fechaHoraInicio,
  );
  const managementLink = new URL(
    `/reservas/gestionar/${encodeURIComponent(committed.capabilityToken)}`,
    siteOrigin,
  ).toString();

  if (committed.negocio.telefonoContacto) {
    await notifyWithoutChangingCommittedResult({
      to: committed.negocio.telefonoContacto,
      nombre_cliente: committed.reservation.nombre,
      telefono_cliente: committed.reservation.telefono,
      fechaHora,
      template: PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA,
      negocioId: committed.negocio.id,
    });
  }

  await notifyWithoutChangingCommittedResult({
    to: committed.reservation.telefono,
    nombre_cliente: committed.reservation.nombre,
    fechaHora,
    enlace_cancelar: managementLink,
    descripcion: committed.reservation.notas ?? "",
    template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
    negocioId: committed.negocio.id,
  });

  return {
    ok: true,
    message: "Reserva creada exitosamente.",
  };
}
