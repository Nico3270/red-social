// app/api/asistente/route.ts

import prisma from "@/lib/prisma";
import { buildPublicBusinessVisibilityWhere } from "@/lib/business/publicBusinessVisibility";
import {
  revokeActiveReservationCapabilitiesInTx,
  rotateReservationCapabilityInTx,
} from "@/reservas/lib/reservation-capability";
import {
  buildCancelReservationOperationFingerprint,
  buildCreateReservationOperationFingerprint,
  buildUpdateReservationOperationFingerprint,
  isValidReservationOperationSourceReference,
  type ReservationCancelOperationPayload,
  type ReservationCreateOperationPayload,
  type ReservationUpdateOperationPayload,
} from "@/reservas/lib/reservation-operation";
import {
  Prisma,
  ReservationOperationAction,
  ReservationOperationOutcome,
  ReservationStatus,
} from "@prisma/client";
import { startOfDay, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error(
    "No es correcta o no está definida la api key de administrador.",
  );
}

/* ============================================================
   TIMEZONE (Colombia)
============================================================ */

const TZ = "America/Bogota";
const SERIALIZABLE_CANCEL_MAX_ATTEMPTS = 3;
const SERIALIZABLE_CREATE_MAX_ATTEMPTS = 3;
const SERIALIZABLE_UPDATE_MAX_ATTEMPTS = 3;
const RESERVATION_CAPABILITY_EXPIRY_MARGIN_MS = 24 * 60 * 60 * 1000;
const RESERVATION_OPERATION_UNIQUE_CONSTRAINT =
  "ReservationOperation_negocioId_action_sourceReference_key";

/**
 * Formatea SIEMPRE en hora Colombia, independientemente del TZ del servidor.
 */
function fmtCO(date: Date, pattern: string): string {
  return formatInTimeZone(date, TZ, pattern, { locale: es });
}

/**
 * Devuelve el rango UTC [inicio, fin) que corresponde a un "día" en Colombia.
 * offsetDays = 0 -> hoy (CO), 1 -> mañana (CO), etc.
 */
function dayRangeUtcCO(offsetDays = 0): { startUtc: Date; endUtc: Date } {
  const now = new Date();

  // "Ahora" visto en hora Colombia (wall time)
  const nowZoned = toZonedTime(now, TZ);

  // Inicio del día en Colombia (wall time)
  const startZoned = startOfDay(addDays(nowZoned, offsetDays));
  const endZoned = addDays(startZoned, 1);

  // Convertimos esos wall-times a instantes UTC reales (para consultar DB)
  const startUtc = fromZonedTime(startZoned, TZ);
  const endUtc = fromZonedTime(endZoned, TZ);

  return { startUtc, endUtc };
}

/**
 * Inicio de semana (lunes) en Colombia, convertido a UTC para query.
 */
function startOfWeekUtcCO(): Date {
  const now = new Date();
  const nowZoned = toZonedTime(now, TZ);
  const startWeekZoned = startOfWeek(nowZoned, { weekStartsOn: 1 });
  return fromZonedTime(startWeekZoned, TZ);
}

/* ============================================================
   TIPOS / CONSTANTES
============================================================ */

const ALLOWED_ACTIONS = [
  "es-negocio",
  "nombre",
  "datos-perfil",
  "resumen-dia",
  "reservas-hoy",
  "reservas-manana",
  "reservas-proximas",
  "proximas-reservas",
  "pedidos-hoy",
  "pedidos-manana",
  "proximos-pedidos",
  "estadisticas-semana",
  "detalle-pedido",
  "detalle-reserva",
  "crear-reserva",
  "modificar-reserva",
  "cancelar-reserva",
] as const;

type AsistenteAction = (typeof ALLOWED_ACTIONS)[number];
const MUTABLE_RESERVATION_STATUSES = [
  ReservationStatus.PENDIENTE,
  ReservationStatus.CONFIRMADA,
  ReservationStatus.CANCELADA,
  ReservationStatus.COMPLETADA,
] as const;
type ReservationStatusValue = (typeof MUTABLE_RESERVATION_STATUSES)[number];

type NegocioLite = {
  id: string;
  nombre: string;
  slug: string;
  fotoPerfil: string | null;
  fotoPortada: string | null;
  ciudad: string;
  direccion: string | null;
  sitioWeb: string | null;
  urlGoogleMaps: string | null;
};

type PedidoItem = {
  quantity: number;
  description: string | null;
  product: { nombre: string | null } | null;
};

type ReservationMutationInput = {
  nombreCliente?: string;
  telefonoCliente?: string;
  fechaHoraInicio?: string;
  fechaHoraFin?: string | null;
  notas?: string | null;
  estado?: ReservationStatusValue;
  permitirSobrecupo: boolean;
  hasNombreCliente: boolean;
  hasTelefonoCliente: boolean;
  hasFechaHoraInicio: boolean;
  hasFechaHoraFin: boolean;
  hasNotas: boolean;
  hasEstado: boolean;
};

type AsistenteRequestBody = {
  action: AsistenteAction;
  telefono: string;
  key: string;
  pedidoId?: string;
  reservaId?: string;
} & ReservationMutationInput;

type BusinessAvailabilityLite = {
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

type CreateReservationBoundaryErrorCode =
  | "IDEMPOTENCY_CONFLICT"
  | "RESERVATION_NOT_AVAILABLE"
  | "CREATE_RETRY_EXHAUSTED"
  | "INTERNAL_ERROR";

class CreateReservationBoundaryError extends Error {
  readonly code: CreateReservationBoundaryErrorCode;

  constructor(code: CreateReservationBoundaryErrorCode) {
    super("Create reservation operation failed.");
    this.name = "CreateReservationBoundaryError";
    this.code = code;
  }
}

type UpdateReservationBoundaryErrorCode =
  | "IDEMPOTENCY_CONFLICT"
  | "RESERVATION_NOT_FOUND"
  | "RESERVATION_NOT_AVAILABLE"
  | "UPDATE_RETRY_EXHAUSTED"
  | "INTERNAL_ERROR";

class UpdateReservationBoundaryError extends Error {
  readonly code: UpdateReservationBoundaryErrorCode;

  constructor(code: UpdateReservationBoundaryErrorCode) {
    super("Update reservation operation failed.");
    this.name = "UpdateReservationBoundaryError";
    this.code = code;
  }
}

type CancelReservationBoundaryErrorCode =
  | "IDEMPOTENCY_CONFLICT"
  | "RESERVATION_NOT_FOUND"
  | "RESERVATION_NOT_AVAILABLE"
  | "CANCEL_RETRY_EXHAUSTED"
  | "INTERNAL_ERROR";

class CancelReservationBoundaryError extends Error {
  readonly code: CancelReservationBoundaryErrorCode;

  constructor(code: CancelReservationBoundaryErrorCode) {
    super("Cancel reservation operation failed.");
    this.name = "CancelReservationBoundaryError";
    this.code = code;
  }
}

/* ============================================================
   HELPERS: VALIDACIÓN / JSON / TELÉFONO
============================================================ */

type JsonRecord = Record<string, unknown>;

function isObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAsistenteAction(value: unknown): value is AsistenteAction {
  return (
    typeof value === "string" &&
    (ALLOWED_ACTIONS as readonly string[]).includes(value)
  );
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableTrimmedString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function hasOwn(record: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasAnyKey(record: JsonRecord, keys: string[]): boolean {
  return keys.some((key) => hasOwn(record, key));
}

function firstNonEmptyString(
  record: JsonRecord,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = asNonEmptyString(record[key]);
    if (value) return value;
  }

  return null;
}

function isReservationStatus(value: unknown): value is ReservationStatusValue {
  return (
    typeof value === "string" &&
    (MUTABLE_RESERVATION_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Normaliza a E.164 mínimo:
 * - Deja solo dígitos
 * - Si son 10 dígitos, asume Colombia (+57)
 * - Prefija +
 */
function normalizePhone(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  const digitsOnly = raw.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";

  const normalizedDigits =
    digitsOnly.length === 10 ? `57${digitsOnly}` : digitsOnly;

  return `+${normalizedDigits}`;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/* ============================================================
   MONEY (Decimal-safe)
============================================================ */

function moneyToNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  if (value && typeof value === "object") {
    const v = value as { toNumber?: () => number; toString?: () => string };

    if (typeof v.toNumber === "function") {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : 0;
    }

    if (typeof v.toString === "function") {
      const n = Number(v.toString());
      return Number.isFinite(n) ? n : 0;
    }
  }

  return 0;
}

function formatMoney(value: unknown): string {
  return moneyToNumber(value).toLocaleString("es-CO");
}

/* ============================================================
   NEGOCIO POR TELÉFONO (ROBUSTO + FALLBACK)
============================================================ */

async function getNegocioByTelefono(
  telefonoRaw: string,
): Promise<NegocioLite | null> {
  const telefono = normalizePhone(telefonoRaw);
  if (!telefono) return null;

  const digits = telefono.replace("+", "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

  const select = {
    id: true,
    nombre: true,
    slug: true,
    fotoPerfil: true,
    fotoPortada: true,
    ciudad: true,
    direccion: true,
    sitioWeb: true,
    urlGoogleMaps: true,
  } satisfies Prisma.NegocioSelect;

  // 1) Exacto (mejor)
  const exact = await prisma.negocio.findFirst({
    where: {
      telefonoContacto: telefono,
      ...buildPublicBusinessVisibilityWhere(),
    },
    select,
  });

  if (exact) return exact;

  // 2) Fallback por "contains" (útil si guardaste sin + o con separadores)
  const fallback = await prisma.negocio.findFirst({
    where: {
      ...buildPublicBusinessVisibilityWhere(),
      telefonoContacto: {
        not: null,
        contains: last10,
      },
    },
    select,
  });

  return fallback ?? null;
}

function buildReservationMessage(
  prefix: string,
  reserva: {
    nombre: string;
    telefono: string;
    fechaHoraInicio: Date;
    fechaHoraFin: Date | null;
    estado: ReservationStatus;
    notas: string | null;
  },
) {
  const rangoFin = reserva.fechaHoraFin
    ? ` a las ${fmtCO(reserva.fechaHoraFin, "hh:mm a")}`
    : "";

  return (
    `${prefix}\n\n` +
    `👤 ${reserva.nombre}\n` +
    `📞 ${reserva.telefono}\n` +
    `📅 ${fmtCO(
      reserva.fechaHoraInicio,
      "EEEE d 'de' MMMM, hh:mm a",
    )}${rangoFin}\n` +
    `📝 ${reserva.notas || "Sin notas"}\n` +
    `Estado: ${reserva.estado}`
  );
}

function buildCancellationNotes(
  currentNotes: string | null,
  reason: string | null | undefined,
): string | null {
  const cancellationLabel = reason
    ? `Cancelada por asistente: ${reason}`
    : "Cancelada por asistente";

  return currentNotes
    ? `${currentNotes}\n${cancellationLabel}`
    : cancellationLabel;
}

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
      (siteUrl.protocol !== "https:" && siteUrl.protocol !== "http:") ||
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

function createAvailabilityRanges(
  config: BusinessAvailabilityLite,
): AvailabilityRange[] | null {
  const rawRanges = [
    [config.franjaMananaInicio, config.franjaMananaFin],
    [config.franjaTardeInicio, config.franjaTardeFin],
  ] as const;
  const ranges: AvailabilityRange[] = [];

  for (const [rawStart, rawEnd] of rawRanges) {
    if (rawStart === null && rawEnd === null) continue;
    if (rawStart === null || rawEnd === null) return null;

    const matchStart = /^(\d{1,2}):(\d{2})$/.exec(rawStart);
    const matchEnd = /^(\d{1,2}):(\d{2})$/.exec(rawEnd);
    if (!matchStart || !matchEnd) return null;

    const startHours = Number(matchStart[1]);
    const startMinutes = Number(matchStart[2]);
    const endHours = Number(matchEnd[1]);
    const endMinutes = Number(matchEnd[2]);
    if (
      !Number.isInteger(startHours) ||
      !Number.isInteger(startMinutes) ||
      !Number.isInteger(endHours) ||
      !Number.isInteger(endMinutes) ||
      startHours < 0 ||
      startHours > 23 ||
      endHours < 0 ||
      endHours > 23 ||
      startMinutes < 0 ||
      startMinutes > 59 ||
      endMinutes < 0 ||
      endMinutes > 59
    ) {
      return null;
    }

    const startMinuteOfDay = startHours * 60 + startMinutes;
    const endMinuteOfDay = endHours * 60 + endMinutes;
    if (endMinuteOfDay <= startMinuteOfDay) return null;

    ranges.push({
      startMinutes: startMinuteOfDay,
      endMinutes: endMinuteOfDay,
    });
  }

  return ranges.length > 0 ? ranges : null;
}

function bogotaDayName(date: Date): string {
  return capitalize(fmtCO(date, "EEEE"));
}

function bogotaMinuteOfDay(date: Date): number {
  return Number(fmtCO(date, "HH")) * 60 + Number(fmtCO(date, "mm"));
}

function validateAnaCreateSchedule(
  start: Date,
  explicitEnd: Date | null,
  config: BusinessAvailabilityLite,
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
    start <= now
  ) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const intervalMilliseconds = config.intervaloMinutos * 60_000;
  const minimumDurationMilliseconds = intervalMilliseconds * minimumIntervals;
  if (!Number.isSafeInteger(minimumDurationMilliseconds)) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const end =
    explicitEnd ?? new Date(start.getTime() + minimumDurationMilliseconds);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    fmtCO(start, "yyyy-MM-dd") !== fmtCO(end, "yyyy-MM-dd") ||
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0
  ) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  if (!config.diasAtencion.includes(bogotaDayName(start))) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const ranges = createAvailabilityRanges(config);
  if (!ranges) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  const startMinutes = bogotaMinuteOfDay(start);
  const endMinutes = bogotaMinuteOfDay(end);
  const matchingRange = ranges.find(
    (range) =>
      startMinutes >= range.startMinutes && endMinutes <= range.endMinutes,
  );
  const durationMilliseconds = end.getTime() - start.getTime();

  if (
    !matchingRange ||
    (startMinutes - matchingRange.startMinutes) % config.intervaloMinutos !==
      0 ||
    durationMilliseconds % intervalMilliseconds !== 0 ||
    durationMilliseconds < minimumDurationMilliseconds
  ) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
  }

  return { end, intervalMilliseconds };
}

function overlapsReservationInterval(
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

function assertAnaCreateAvailability(
  rows: OccupancyRow[],
  start: Date,
  end: Date,
  intervalMilliseconds: number,
  capacity: number,
): void {
  if (
    rows.some(
      (row) =>
        row.estado === ReservationStatus.BLOQUEADA &&
        overlapsReservationInterval(row, start, end),
    )
  ) {
    throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
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
      return consumesCapacity &&
        overlapsReservationInterval(row, intervalStart, intervalEnd)
        ? total + 1
        : total;
    }, 0);

    if (count >= capacity) {
      throw new CreateReservationBoundaryError("RESERVATION_NOT_AVAILABLE");
    }
  }
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isReservationOperationUniqueConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const meta = error.meta;
  if (
    meta?.modelName !== undefined &&
    meta.modelName !== "ReservationOperation"
  ) {
    return false;
  }

  const expectedFields = ["negocioId", "action", "sourceReference"];
  const target = meta?.target;
  const targetMatches =
    Array.isArray(target) &&
    target.length === expectedFields.length &&
    expectedFields.every((field) => target.includes(field));
  const namedConstraintMatches =
    target === RESERVATION_OPERATION_UNIQUE_CONSTRAINT ||
    meta?.constraint === RESERVATION_OPERATION_UNIQUE_CONSTRAINT;

  return targetMatches || namedConstraintMatches;
}

function isReplayManagementEligible(
  reservation: {
    estado: ReservationStatus;
    fechaHoraInicio: Date;
    fechaHoraFin: Date | null;
  },
  now: Date,
): boolean {
  if (
    reservation.estado !== ReservationStatus.PENDIENTE &&
    reservation.estado !== ReservationStatus.CONFIRMADA
  ) {
    return false;
  }

  const startTimestamp = reservation.fechaHoraInicio.getTime();
  const endTimestamp = reservation.fechaHoraFin?.getTime() ?? startTimestamp;
  const horizonTimestamp =
    Math.max(startTimestamp, endTimestamp) +
    RESERVATION_CAPABILITY_EXPIRY_MARGIN_MS;

  return (
    Number.isFinite(startTimestamp) &&
    Number.isFinite(endTimestamp) &&
    Number.isFinite(horizonTimestamp) &&
    horizonTimestamp > now.getTime()
  );
}

async function crearReservaAsistente(args: {
  negocioId: string;
  sourceReference: string;
  requestFingerprint: string;
  payload: ReservationCreateOperationPayload;
}) {
  const { negocioId, sourceReference, requestFingerprint, payload } = args;

  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_CREATE_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingOperation = await tx.reservationOperation.findUnique({
            where: {
              negocioId_action_sourceReference: {
                negocioId,
                action: ReservationOperationAction.CREATE,
                sourceReference,
              },
            },
            include: {
              reservation: true,
            },
          });

          if (existingOperation) {
            if (existingOperation.requestFingerprint !== requestFingerprint) {
              throw new CreateReservationBoundaryError("IDEMPOTENCY_CONFLICT");
            }

            const existingReservation = existingOperation.reservation;
            if (existingReservation.negocioId !== negocioId) {
              throw new CreateReservationBoundaryError("INTERNAL_ERROR");
            }

            if (!isReplayManagementEligible(existingReservation, new Date())) {
              return {
                reserva: existingReservation,
                capabilityToken: null,
              };
            }

            const capability = await rotateReservationCapabilityInTx(tx, {
              reservationId: existingReservation.id,
              fechaHoraInicio: existingReservation.fechaHoraInicio,
              fechaHoraFin: existingReservation.fechaHoraFin,
            });

            return {
              reserva: existingReservation,
              capabilityToken: capability.token,
            };
          }

          const config = await tx.businessAvailability.findUnique({
            where: { negocioId },
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
          });
          if (!config) {
            throw new CreateReservationBoundaryError(
              "RESERVATION_NOT_AVAILABLE",
            );
          }

          const fechaHoraInicio = new Date(payload.fechaHoraInicio);
          const fechaHoraFin = payload.fechaHoraFin
            ? new Date(payload.fechaHoraFin)
            : null;
          if (
            !Number.isFinite(fechaHoraInicio.getTime()) ||
            (fechaHoraFin && !Number.isFinite(fechaHoraFin.getTime()))
          ) {
            throw new CreateReservationBoundaryError("INTERNAL_ERROR");
          }

          const { end, intervalMilliseconds } = validateAnaCreateSchedule(
            fechaHoraInicio,
            fechaHoraFin,
            config,
            new Date(),
          );
          const occupancyRows = await tx.reservation.findMany({
            where: {
              negocioId,
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
                    gt: fechaHoraInicio,
                  },
                },
                {
                  fechaHoraFin: null,
                  fechaHoraInicio: {
                    gte: fechaHoraInicio,
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

          assertAnaCreateAvailability(
            occupancyRows,
            fechaHoraInicio,
            end,
            intervalMilliseconds,
            config.capacidadPorIntervalo,
          );

          const reserva = await tx.reservation.create({
            data: {
              negocioId,
              nombre: payload.nombreCliente,
              telefono: payload.telefonoCliente,
              fechaHoraInicio,
              fechaHoraFin: end,
              notas: payload.notas,
              estado: payload.estado,
            },
          });
          const capability = await rotateReservationCapabilityInTx(tx, {
            reservationId: reserva.id,
            fechaHoraInicio: reserva.fechaHoraInicio,
            fechaHoraFin: reserva.fechaHoraFin,
          });

          await tx.reservationOperation.create({
            data: {
              negocioId,
              reservationId: reserva.id,
              action: ReservationOperationAction.CREATE,
              sourceReference,
              requestFingerprint,
              managementLinkRequired: true,
              outcome: ReservationOperationOutcome.CREATED,
            },
          });

          return {
            reserva,
            capabilityToken: capability.token,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      const retryable =
        isSerializableConflict(error) ||
        isReservationOperationUniqueConflict(error);
      if (retryable && attempt < SERIALIZABLE_CREATE_MAX_ATTEMPTS) {
        continue;
      }
      if (retryable) {
        throw new CreateReservationBoundaryError("CREATE_RETRY_EXHAUSTED");
      }

      throw error;
    }
  }

  throw new CreateReservationBoundaryError("CREATE_RETRY_EXHAUSTED");
}

function hasUpdateChange(
  cambios: ReservationUpdateOperationPayload["cambios"],
  field: keyof ReservationUpdateOperationPayload["cambios"],
): boolean {
  return Object.prototype.hasOwnProperty.call(cambios, field);
}

function nullableDatesEqual(left: Date | null, right: Date | null): boolean {
  if (left === null || right === null) return left === right;
  return left.getTime() === right.getTime();
}

async function modificarReservaAsistente(args: {
  negocioId: string;
  sourceReference: string;
  requestFingerprint: string;
  payload: ReservationUpdateOperationPayload;
}) {
  const { negocioId, sourceReference, requestFingerprint, payload } = args;

  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_UPDATE_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingOperation = await tx.reservationOperation.findUnique({
            where: {
              negocioId_action_sourceReference: {
                negocioId,
                action: ReservationOperationAction.UPDATE,
                sourceReference,
              },
            },
            select: {
              reservationId: true,
              requestFingerprint: true,
              managementLinkRequired: true,
              outcome: true,
            },
          });

          if (existingOperation) {
            if (existingOperation.requestFingerprint !== requestFingerprint) {
              throw new UpdateReservationBoundaryError("IDEMPOTENCY_CONFLICT");
            }
            if (
              existingOperation.outcome !==
                ReservationOperationOutcome.UPDATED &&
              existingOperation.outcome !==
                ReservationOperationOutcome.UNCHANGED
            ) {
              throw new UpdateReservationBoundaryError("INTERNAL_ERROR");
            }

            const existingReservation = await tx.reservation.findFirst({
              where: {
                id: existingOperation.reservationId,
                negocioId,
              },
            });
            if (!existingReservation) {
              throw new UpdateReservationBoundaryError("INTERNAL_ERROR");
            }

            if (
              !existingOperation.managementLinkRequired ||
              !isReplayManagementEligible(existingReservation, new Date())
            ) {
              return {
                reserva: existingReservation,
                outcome: existingOperation.outcome,
                capabilityToken: null,
              };
            }

            const capability = await rotateReservationCapabilityInTx(tx, {
              reservationId: existingReservation.id,
              fechaHoraInicio: existingReservation.fechaHoraInicio,
              fechaHoraFin: existingReservation.fechaHoraFin,
            });

            return {
              reserva: existingReservation,
              outcome: existingOperation.outcome,
              capabilityToken: capability.token,
            };
          }

          const reservaActual = await tx.reservation.findFirst({
            where: {
              id: payload.reservaId,
              negocioId,
            },
          });
          if (!reservaActual) {
            throw new UpdateReservationBoundaryError("RESERVATION_NOT_FOUND");
          }
          if (
            reservaActual.estado !== ReservationStatus.PENDIENTE &&
            reservaActual.estado !== ReservationStatus.CONFIRMADA
          ) {
            throw new UpdateReservationBoundaryError(
              "RESERVATION_NOT_AVAILABLE",
            );
          }

          const cambios = payload.cambios;
          const hasNombre = hasUpdateChange(cambios, "nombreCliente");
          const hasTelefono = hasUpdateChange(cambios, "telefonoCliente");
          const hasInicio = hasUpdateChange(cambios, "fechaHoraInicio");
          const hasFin = hasUpdateChange(cambios, "fechaHoraFin");
          const hasNotas = hasUpdateChange(cambios, "notas");
          const hasEstado = hasUpdateChange(cambios, "estado");

          const nextNombre = hasNombre
            ? cambios.nombreCliente!
            : reservaActual.nombre;
          const normalizedCurrentPhone =
            normalizePhone(reservaActual.telefono) || reservaActual.telefono;
          const phoneChanged =
            hasTelefono && cambios.telefonoCliente !== normalizedCurrentPhone;
          const nextTelefono = phoneChanged
            ? cambios.telefonoCliente!
            : reservaActual.telefono;
          const nextNotas = hasNotas
            ? (cambios.notas ?? null)
            : reservaActual.notas;
          const nextEstado = hasEstado ? cambios.estado! : reservaActual.estado;

          let nextInicio = reservaActual.fechaHoraInicio;
          if (hasInicio) {
            nextInicio = new Date(cambios.fechaHoraInicio!);
            if (!Number.isFinite(nextInicio.getTime())) {
              throw new UpdateReservationBoundaryError("INTERNAL_ERROR");
            }
          }

          let nextFin = reservaActual.fechaHoraFin;
          if (hasFin && cambios.fechaHoraFin !== null) {
            nextFin = new Date(cambios.fechaHoraFin!);
            if (!Number.isFinite(nextFin.getTime())) {
              throw new UpdateReservationBoundaryError("INTERNAL_ERROR");
            }
          }

          if (hasInicio || hasFin) {
            const config = await tx.businessAvailability.findUnique({
              where: { negocioId },
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
            });
            if (!config) {
              throw new UpdateReservationBoundaryError(
                "RESERVATION_NOT_AVAILABLE",
              );
            }

            let schedule: {
              end: Date;
              intervalMilliseconds: number;
            };
            try {
              schedule = validateAnaCreateSchedule(
                nextInicio,
                hasFin && cambios.fechaHoraFin === null ? null : nextFin,
                config,
                new Date(),
              );
            } catch {
              throw new UpdateReservationBoundaryError(
                "RESERVATION_NOT_AVAILABLE",
              );
            }
            if (hasFin) {
              nextFin = schedule.end;
            }

            const occupancyRows = await tx.reservation.findMany({
              where: {
                id: { not: reservaActual.id },
                negocioId,
                estado: {
                  in: [
                    ReservationStatus.PENDIENTE,
                    ReservationStatus.CONFIRMADA,
                    ReservationStatus.BLOQUEADA,
                  ],
                },
                fechaHoraInicio: {
                  lt: schedule.end,
                },
                OR: [
                  {
                    fechaHoraFin: {
                      gt: nextInicio,
                    },
                  },
                  {
                    fechaHoraFin: null,
                    fechaHoraInicio: {
                      gte: nextInicio,
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

            try {
              assertAnaCreateAvailability(
                occupancyRows,
                nextInicio,
                schedule.end,
                schedule.intervalMilliseconds,
                config.capacidadPorIntervalo,
              );
            } catch {
              throw new UpdateReservationBoundaryError(
                "RESERVATION_NOT_AVAILABLE",
              );
            }
          }

          const nombreChanged =
            hasNombre && nextNombre !== reservaActual.nombre;
          const inicioChanged =
            hasInicio &&
            nextInicio.getTime() !== reservaActual.fechaHoraInicio.getTime();
          const finChanged =
            hasFin && !nullableDatesEqual(nextFin, reservaActual.fechaHoraFin);
          const notasChanged = hasNotas && nextNotas !== reservaActual.notas;
          const estadoChanged =
            hasEstado && nextEstado !== reservaActual.estado;
          const hasEffectiveChanges =
            nombreChanged ||
            phoneChanged ||
            inicioChanged ||
            finChanged ||
            notasChanged ||
            estadoChanged;

          if (!hasEffectiveChanges) {
            await tx.reservationOperation.create({
              data: {
                negocioId,
                reservationId: reservaActual.id,
                action: ReservationOperationAction.UPDATE,
                sourceReference,
                requestFingerprint,
                managementLinkRequired: false,
                outcome: ReservationOperationOutcome.UNCHANGED,
              },
            });

            return {
              reserva: reservaActual,
              outcome: ReservationOperationOutcome.UNCHANGED,
              capabilityToken: null,
            };
          }

          const reserva = await tx.reservation.update({
            where: {
              id: reservaActual.id,
              negocioId,
              estado: reservaActual.estado,
            },
            data: {
              nombre: nextNombre,
              telefono: nextTelefono,
              fechaHoraInicio: nextInicio,
              fechaHoraFin: nextFin,
              notas: nextNotas,
              estado: nextEstado,
            },
          });

          let capabilityToken: string | null = null;
          let managementLinkRequired = false;
          if (nextEstado === ReservationStatus.COMPLETADA) {
            await revokeActiveReservationCapabilitiesInTx(tx, reserva.id);
          } else if (phoneChanged || inicioChanged || finChanged) {
            const capability = await rotateReservationCapabilityInTx(tx, {
              reservationId: reserva.id,
              fechaHoraInicio: reserva.fechaHoraInicio,
              fechaHoraFin: reserva.fechaHoraFin,
            });
            capabilityToken = capability.token;
            managementLinkRequired = true;
          }

          await tx.reservationOperation.create({
            data: {
              negocioId,
              reservationId: reserva.id,
              action: ReservationOperationAction.UPDATE,
              sourceReference,
              requestFingerprint,
              managementLinkRequired,
              outcome: ReservationOperationOutcome.UPDATED,
            },
          });

          return {
            reserva,
            outcome: ReservationOperationOutcome.UPDATED,
            capabilityToken,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      const retryable =
        isSerializableConflict(error) ||
        isReservationOperationUniqueConflict(error);
      if (retryable && attempt < SERIALIZABLE_UPDATE_MAX_ATTEMPTS) {
        continue;
      }
      if (retryable) {
        throw new UpdateReservationBoundaryError("UPDATE_RETRY_EXHAUSTED");
      }

      throw error;
    }
  }

  throw new UpdateReservationBoundaryError("UPDATE_RETRY_EXHAUSTED");
}

async function cancelarReservaAsistente(args: {
  negocioId: string;
  sourceReference: string;
  requestFingerprint: string;
  payload: ReservationCancelOperationPayload;
}) {
  const { negocioId, sourceReference, requestFingerprint, payload } = args;

  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_CANCEL_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingOperation = await tx.reservationOperation.findUnique({
            where: {
              negocioId_action_sourceReference: {
                negocioId,
                action: ReservationOperationAction.CANCEL,
                sourceReference,
              },
            },
            select: {
              reservationId: true,
              requestFingerprint: true,
              outcome: true,
            },
          });

          if (existingOperation) {
            if (existingOperation.requestFingerprint !== requestFingerprint) {
              throw new CancelReservationBoundaryError("IDEMPOTENCY_CONFLICT");
            }
            if (
              existingOperation.outcome !==
                ReservationOperationOutcome.CANCELLED &&
              existingOperation.outcome !==
                ReservationOperationOutcome.ALREADY_CANCELLED
            ) {
              throw new CancelReservationBoundaryError("INTERNAL_ERROR");
            }

            const existingReservation = await tx.reservation.findFirst({
              where: {
                id: existingOperation.reservationId,
                negocioId,
              },
            });
            if (!existingReservation) {
              throw new CancelReservationBoundaryError("INTERNAL_ERROR");
            }

            return {
              reserva: existingReservation,
              outcome: existingOperation.outcome,
            };
          }

          const reservaActual = await tx.reservation.findFirst({
            where: {
              id: payload.reservaId,
              negocioId,
            },
          });
          if (!reservaActual) {
            throw new CancelReservationBoundaryError("RESERVATION_NOT_FOUND");
          }

          if (reservaActual.estado === ReservationStatus.CANCELADA) {
            await revokeActiveReservationCapabilitiesInTx(tx, reservaActual.id);
            await tx.reservationOperation.create({
              data: {
                negocioId,
                reservationId: reservaActual.id,
                action: ReservationOperationAction.CANCEL,
                sourceReference,
                requestFingerprint,
                managementLinkRequired: false,
                outcome: ReservationOperationOutcome.ALREADY_CANCELLED,
              },
            });

            return {
              reserva: reservaActual,
              outcome: ReservationOperationOutcome.ALREADY_CANCELLED,
            };
          }

          if (
            reservaActual.estado !== ReservationStatus.PENDIENTE &&
            reservaActual.estado !== ReservationStatus.CONFIRMADA
          ) {
            throw new CancelReservationBoundaryError(
              "RESERVATION_NOT_AVAILABLE",
            );
          }

          const notas = buildCancellationNotes(
            reservaActual.notas,
            payload.motivo,
          );
          const updated = await tx.reservation.updateMany({
            where: {
              id: reservaActual.id,
              negocioId,
              estado: {
                in: [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA],
              },
            },
            data: {
              estado: ReservationStatus.CANCELADA,
              notas,
            },
          });
          if (updated.count !== 1) {
            throw new CancelReservationBoundaryError(
              "RESERVATION_NOT_AVAILABLE",
            );
          }

          await revokeActiveReservationCapabilitiesInTx(tx, reservaActual.id);
          await tx.reservationOperation.create({
            data: {
              negocioId,
              reservationId: reservaActual.id,
              action: ReservationOperationAction.CANCEL,
              sourceReference,
              requestFingerprint,
              managementLinkRequired: false,
              outcome: ReservationOperationOutcome.CANCELLED,
            },
          });

          const reserva = await tx.reservation.findFirst({
            where: {
              id: reservaActual.id,
              negocioId,
            },
          });
          if (!reserva) {
            throw new CancelReservationBoundaryError("INTERNAL_ERROR");
          }

          return {
            reserva,
            outcome: ReservationOperationOutcome.CANCELLED,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      const retryable =
        isSerializableConflict(error) ||
        isReservationOperationUniqueConflict(error);
      if (retryable && attempt < SERIALIZABLE_CANCEL_MAX_ATTEMPTS) {
        continue;
      }
      if (retryable) {
        throw new CancelReservationBoundaryError("CANCEL_RETRY_EXHAUSTED");
      }

      throw error;
    }
  }

  throw new CancelReservationBoundaryError("CANCEL_RETRY_EXHAUSTED");
}

/* ============================================================
   ENDPOINT PRINCIPAL
============================================================ */

export async function POST(request: Request) {
  try {
    const rawBody: unknown = await request.json();

    if (!isObject(rawBody)) {
      return Response.json(
        { error: "Body inválido", mensaje: "Body inválido" },
        { status: 400 },
      );
    }

    const actionRaw = rawBody.action;

    // Soportar key por body o por header (compatibilidad con agentes)
    const headerKey = asNonEmptyString(request.headers.get("x-api-key"));
    const key = asNonEmptyString(rawBody.key) ?? headerKey;

    const telefono = asNonEmptyString(rawBody.telefono);
    const pedidoId = asNonEmptyString(rawBody.pedidoId);
    const reservaId = asNonEmptyString(rawBody.reservaId);
    const sourceReference = rawBody.sourceReference;
    const hasNombreCliente = hasAnyKey(rawBody, [
      "nombreCliente",
      "clienteNombre",
      "nombre",
    ]);
    const nombreCliente = firstNonEmptyString(rawBody, [
      "nombreCliente",
      "clienteNombre",
      "nombre",
    ]);
    const hasTelefonoCliente = hasAnyKey(rawBody, [
      "telefonoCliente",
      "celularCliente",
      "telefonoReserva",
    ]);
    const telefonoCliente = firstNonEmptyString(rawBody, [
      "telefonoCliente",
      "celularCliente",
      "telefonoReserva",
    ]);
    const hasFechaHoraInicio = hasOwn(rawBody, "fechaHoraInicio");
    const fechaHoraInicio = asNonEmptyString(rawBody.fechaHoraInicio);
    const hasFechaHoraFin = hasOwn(rawBody, "fechaHoraFin");
    const fechaHoraFin = hasFechaHoraFin
      ? asNullableTrimmedString(rawBody.fechaHoraFin)
      : undefined;
    const hasNotas = hasOwn(rawBody, "notas");
    const notas = hasNotas ? asNullableTrimmedString(rawBody.notas) : undefined;
    const hasEstado = hasOwn(rawBody, "estado");
    const estado = isReservationStatus(rawBody.estado)
      ? rawBody.estado
      : undefined;
    const permitirSobrecupo = asBoolean(rawBody.permitirSobrecupo) ?? false;

    if (!key || key !== ADMIN_KEY) {
      return Response.json(
        { error: "Unauthorized", mensaje: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!telefono) {
      return Response.json(
        {
          error: "Falta telefono en el body",
          mensaje: "Falta telefono en el body",
        },
        { status: 400 },
      );
    }

    if (hasNombreCliente && !nombreCliente) {
      return Response.json(
        {
          error: "nombreCliente inválido",
          mensaje: "nombreCliente inválido",
        },
        { status: 400 },
      );
    }

    if (hasTelefonoCliente && !telefonoCliente) {
      return Response.json(
        {
          error: "telefonoCliente inválido",
          mensaje: "telefonoCliente inválido",
        },
        { status: 400 },
      );
    }

    if (hasFechaHoraInicio && !fechaHoraInicio) {
      return Response.json(
        {
          error: "fechaHoraInicio inválida",
          mensaje: "fechaHoraInicio inválida",
        },
        { status: 400 },
      );
    }

    if (hasFechaHoraFin && fechaHoraFin === undefined) {
      return Response.json(
        {
          error: "fechaHoraFin inválida",
          mensaje: "fechaHoraFin inválida",
        },
        { status: 400 },
      );
    }

    if (hasNotas && notas === undefined) {
      return Response.json(
        {
          error: "notas inválidas",
          mensaje: "notas inválidas",
        },
        { status: 400 },
      );
    }

    if (hasEstado && !estado) {
      return Response.json(
        {
          error: "estado inválido",
          mensaje:
            "estado inválido. Usa PENDIENTE, CONFIRMADA, CANCELADA o COMPLETADA.",
        },
        { status: 400 },
      );
    }

    if (!isAsistenteAction(actionRaw)) {
      return Response.json(
        {
          ok: false,
          error: "Acción no encontrada",
          mensaje: "Acción no encontrada",
          allowedActions: ALLOWED_ACTIONS,
        },
        { status: 404 },
      );
    }

    const body: AsistenteRequestBody = {
      action: actionRaw,
      telefono,
      key,
      permitirSobrecupo,
      hasNombreCliente,
      hasTelefonoCliente,
      hasFechaHoraInicio,
      hasFechaHoraFin,
      hasNotas,
      hasEstado,
      ...(pedidoId ? { pedidoId } : {}),
      ...(reservaId ? { reservaId } : {}),
      ...(nombreCliente ? { nombreCliente } : {}),
      ...(telefonoCliente ? { telefonoCliente } : {}),
      ...(fechaHoraInicio ? { fechaHoraInicio } : {}),
      ...(hasFechaHoraFin ? { fechaHoraFin: fechaHoraFin ?? null } : {}),
      ...(hasNotas ? { notas: notas ?? null } : {}),
      ...(estado ? { estado } : {}),
    };

    /* === es-negocio === */
    if (body.action === "es-negocio") {
      const negocio = await getNegocioByTelefono(body.telefono);
      return Response.json({
        isBusiness: !!negocio,
        businessName: negocio?.nombre ?? null,
      });
    }

    /* === Validar negocio para cualquier otra acción === */
    const negocio = await getNegocioByTelefono(body.telefono);

    if (!negocio) {
      return Response.json(
        {
          error: "Negocio no encontrado",
          mensaje: "Negocio no encontrado",
          isBusiness: false,
          businessName: null,
          datos: null,
        },
        { status: 404 },
      );
    }

    // Meta común: se adjunta en TODAS las respuestas OK para que el agente pueda cachear el nombre real.
    const baseMeta = {
      isBusiness: true,
      businessName: negocio.nombre,
    };

    /* === Acciones === */
    switch (body.action) {
      case "nombre":
        return Response.json({ ...baseMeta, nombre: negocio.nombre });

      case "datos-perfil":
        return Response.json({ ...baseMeta, ...(await datosPerfil(negocio)) });

      case "resumen-dia":
        return Response.json({
          ...baseMeta,
          ...(await resumenDia(negocio.id)),
        });

      case "reservas-hoy":
        return Response.json({
          ...baseMeta,
          ...(await reservasHoy(negocio.id)),
        });

      case "reservas-manana":
        return Response.json({
          ...baseMeta,
          ...(await reservasManana(negocio.id)),
        });

      case "reservas-proximas":
      case "proximas-reservas":
        return Response.json({
          ...baseMeta,
          ...(await reservasProximas(negocio.id)),
        });

      case "pedidos-hoy":
        return Response.json({
          ...baseMeta,
          ...(await pedidosHoy(negocio.id)),
        });

      case "pedidos-manana":
        return Response.json({
          ...baseMeta,
          ...(await pedidosManana(negocio.id)),
        });

      case "proximos-pedidos":
        return Response.json({
          ...baseMeta,
          ...(await proximosPedidos(negocio.id)),
        });

      case "estadisticas-semana":
        return Response.json({
          ...baseMeta,
          ...(await estadisticasSemana(negocio.id)),
        });

      case "detalle-pedido":
        if (!body.pedidoId) {
          return Response.json(
            { error: "pedidoId requerido", mensaje: "pedidoId requerido" },
            { status: 400 },
          );
        }
        return Response.json({
          ...baseMeta,
          ...(await detallePedido(negocio.id, body.pedidoId)),
        });

      case "detalle-reserva":
        if (!body.reservaId) {
          return Response.json(
            { error: "reservaId requerido", mensaje: "reservaId requerido" },
            { status: 400 },
          );
        }
        return Response.json({
          ...baseMeta,
          ...(await detalleReserva(negocio.id, body.reservaId)),
        });

      case "crear-reserva": {
        if (!isValidReservationOperationSourceReference(sourceReference)) {
          const message = "La referencia de operación no es válida.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_SOURCE_REFERENCE",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        if (
          !body.nombreCliente ||
          !body.telefonoCliente ||
          !body.fechaHoraInicio
        ) {
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error:
                "nombreCliente, telefonoCliente y fechaHoraInicio son requeridos",
              mensaje:
                "nombreCliente, telefonoCliente y fechaHoraInicio son requeridos",
            },
            { status: 400 },
          );
        }

        const fingerprintInput: JsonRecord = {
          nombreCliente: body.nombreCliente,
          telefonoCliente: body.telefonoCliente,
          fechaHoraInicio: body.fechaHoraInicio,
          ...(body.hasFechaHoraFin
            ? { fechaHoraFin: body.fechaHoraFin ?? null }
            : {}),
          ...(body.hasNotas ? { notas: body.notas ?? null } : {}),
          ...(body.hasEstado ? { estado: body.estado } : {}),
          ...(hasOwn(rawBody, "permitirSobrecupo")
            ? { permitirSobrecupo: rawBody.permitirSobrecupo }
            : {}),
        };
        const fingerprintResult =
          buildCreateReservationOperationFingerprint(fingerprintInput);
        if (!fingerprintResult) {
          const message = "Los datos de la reserva no son válidos.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        if (
          fingerprintResult.payload.estado !== ReservationStatus.PENDIENTE &&
          fingerprintResult.payload.estado !== ReservationStatus.CONFIRMADA
        ) {
          const message = "El estado inicial de la reserva no es válido.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_STATUS",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        if (fingerprintResult.payload.permitirSobrecupo) {
          const message = "No se permite crear reservas con sobrecupo.";
          return Response.json(
            {
              ok: false,
              code: "OVERCAPACITY_NOT_ALLOWED",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        const siteOrigin = getCanonicalSiteOrigin();
        if (!siteOrigin) {
          const message = "No fue posible crear la reserva.";
          return Response.json(
            {
              ok: false,
              code: "INTERNAL_ERROR",
              error: message,
              mensaje: message,
            },
            { status: 500 },
          );
        }

        try {
          const result = await crearReservaAsistente({
            negocioId: negocio.id,
            sourceReference,
            requestFingerprint: fingerprintResult.fingerprint,
            payload: fingerprintResult.payload,
          });
          const managementUrl = result.capabilityToken
            ? `${siteOrigin}/reservas/gestionar/${encodeURIComponent(
                result.capabilityToken,
              )}`
            : null;

          return Response.json(
            {
              ...baseMeta,
              ok: true,
              mensaje: buildReservationMessage(
                "Reserva creada exitosamente ✅",
                result.reserva,
              ),
              reserva: result.reserva,
              managementUrl,
            },
            { status: 201 },
          );
        } catch (error) {
          if (
            error instanceof CreateReservationBoundaryError &&
            error.code === "IDEMPOTENCY_CONFLICT"
          ) {
            const message =
              "La referencia de idempotencia ya fue utilizada con datos diferentes.";
            return Response.json(
              {
                ok: false,
                code: "IDEMPOTENCY_CONFLICT",
                error: message,
                mensaje: message,
              },
              { status: 409 },
            );
          }

          if (
            error instanceof CreateReservationBoundaryError &&
            error.code === "RESERVATION_NOT_AVAILABLE"
          ) {
            const message =
              "La reserva no está disponible para el horario seleccionado.";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_NOT_AVAILABLE",
                error: message,
                mensaje: message,
              },
              { status: 400 },
            );
          }

          if (
            error instanceof CreateReservationBoundaryError &&
            error.code === "CREATE_RETRY_EXHAUSTED"
          ) {
            const message = "No fue posible crear la reserva en este momento.";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_CREATE_RETRY_EXHAUSTED",
                error: message,
                mensaje: message,
              },
              { status: 503 },
            );
          }

          const message = "No fue posible crear la reserva.";
          return Response.json(
            {
              ok: false,
              code: "INTERNAL_ERROR",
              error: message,
              mensaje: message,
            },
            { status: 500 },
          );
        }
      }

      case "modificar-reserva": {
        if (!isValidReservationOperationSourceReference(sourceReference)) {
          const message = "La referencia de operación no es válida.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_SOURCE_REFERENCE",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        if (!body.reservaId) {
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error: "reservaId requerido",
              mensaje: "reservaId requerido",
            },
            { status: 400 },
          );
        }
        if (
          !body.hasNombreCliente &&
          !body.hasTelefonoCliente &&
          !body.hasFechaHoraInicio &&
          !body.hasFechaHoraFin &&
          !body.hasNotas &&
          !body.hasEstado
        ) {
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error: "No hay cambios para aplicar",
              mensaje:
                "Envía al menos uno de estos campos: nombreCliente, telefonoCliente, fechaHoraInicio, fechaHoraFin, notas o estado.",
            },
            { status: 400 },
          );
        }

        const fingerprintInput: JsonRecord = {
          reservaId: body.reservaId,
          ...(body.hasNombreCliente
            ? { nombreCliente: body.nombreCliente }
            : {}),
          ...(body.hasTelefonoCliente
            ? { telefonoCliente: body.telefonoCliente }
            : {}),
          ...(body.hasFechaHoraInicio
            ? { fechaHoraInicio: body.fechaHoraInicio }
            : {}),
          ...(body.hasFechaHoraFin
            ? { fechaHoraFin: body.fechaHoraFin ?? null }
            : {}),
          ...(body.hasNotas ? { notas: body.notas ?? null } : {}),
          ...(body.hasEstado ? { estado: body.estado } : {}),
          ...(hasOwn(rawBody, "permitirSobrecupo")
            ? { permitirSobrecupo: rawBody.permitirSobrecupo }
            : {}),
        };
        const fingerprintResult =
          buildUpdateReservationOperationFingerprint(fingerprintInput);
        if (!fingerprintResult) {
          const message = "Los datos de la reserva no son válidos.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        const requestedStatus = fingerprintResult.payload.cambios.estado;
        if (requestedStatus === ReservationStatus.CANCELADA) {
          const message = "El estado solicitado para la reserva no es válido.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_STATUS",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        if (fingerprintResult.payload.permitirSobrecupo) {
          const message = "No se permite modificar reservas con sobrecupo.";
          return Response.json(
            {
              ok: false,
              code: "OVERCAPACITY_NOT_ALLOWED",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        const siteOrigin = getCanonicalSiteOrigin();
        if (!siteOrigin) {
          const message = "No fue posible modificar la reserva.";
          return Response.json(
            {
              ok: false,
              code: "INTERNAL_ERROR",
              error: message,
              mensaje: message,
            },
            { status: 500 },
          );
        }

        try {
          const result = await modificarReservaAsistente({
            negocioId: negocio.id,
            sourceReference,
            requestFingerprint: fingerprintResult.fingerprint,
            payload: fingerprintResult.payload,
          });
          const managementUrl = result.capabilityToken
            ? `${siteOrigin}/reservas/gestionar/${encodeURIComponent(
                result.capabilityToken,
              )}`
            : null;
          const mensaje =
            result.outcome === ReservationOperationOutcome.UNCHANGED
              ? "La reserva ya tiene esos datos."
              : buildReservationMessage(
                  "Reserva actualizada exitosamente ✏️",
                  result.reserva,
                );

          return Response.json({
            ...baseMeta,
            ok: true,
            mensaje,
            reserva: result.reserva,
            managementUrl,
          });
        } catch (error) {
          if (
            error instanceof UpdateReservationBoundaryError &&
            error.code === "IDEMPOTENCY_CONFLICT"
          ) {
            const message =
              "La referencia de idempotencia ya fue utilizada con datos diferentes.";
            return Response.json(
              {
                ok: false,
                code: "IDEMPOTENCY_CONFLICT",
                error: message,
                mensaje: message,
              },
              { status: 409 },
            );
          }

          if (
            error instanceof UpdateReservationBoundaryError &&
            error.code === "RESERVATION_NOT_FOUND"
          ) {
            const message = "Reserva no encontrada";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_NOT_FOUND",
                error: message,
                mensaje: message,
              },
              { status: 400 },
            );
          }

          if (
            error instanceof UpdateReservationBoundaryError &&
            error.code === "RESERVATION_NOT_AVAILABLE"
          ) {
            const message = "La reserva ya no se puede modificar.";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_NOT_AVAILABLE",
                error: message,
                mensaje: message,
              },
              { status: 400 },
            );
          }

          if (
            error instanceof UpdateReservationBoundaryError &&
            error.code === "UPDATE_RETRY_EXHAUSTED"
          ) {
            const message =
              "No fue posible modificar la reserva en este momento.";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_UPDATE_RETRY_EXHAUSTED",
                error: message,
                mensaje: message,
              },
              { status: 503 },
            );
          }

          const message = "No fue posible modificar la reserva.";
          return Response.json(
            {
              ok: false,
              code: "INTERNAL_ERROR",
              error: message,
              mensaje: message,
            },
            { status: 500 },
          );
        }
      }

      case "cancelar-reserva": {
        if (!isValidReservationOperationSourceReference(sourceReference)) {
          const message = "La referencia de operación no es válida.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_SOURCE_REFERENCE",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        if (!body.reservaId) {
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error: "reservaId requerido",
              mensaje: "reservaId requerido",
            },
            { status: 400 },
          );
        }

        const fingerprintResult = buildCancelReservationOperationFingerprint({
          reservaId: body.reservaId,
          ...(body.hasNotas ? { notas: body.notas ?? null } : {}),
        });
        if (!fingerprintResult) {
          const message = "Los datos de la reserva no son válidos.";
          return Response.json(
            {
              ok: false,
              code: "INVALID_RESERVATION_INPUT",
              error: message,
              mensaje: message,
            },
            { status: 400 },
          );
        }

        try {
          const result = await cancelarReservaAsistente({
            negocioId: negocio.id,
            sourceReference,
            requestFingerprint: fingerprintResult.fingerprint,
            payload: fingerprintResult.payload,
          });
          const mensaje =
            result.outcome === ReservationOperationOutcome.ALREADY_CANCELLED
              ? "La reserva ya estaba cancelada."
              : buildReservationMessage(
                  "Reserva cancelada exitosamente ❌",
                  result.reserva,
                );

          return Response.json({
            ...baseMeta,
            ok: true,
            mensaje,
            reserva: result.reserva,
            managementUrl: null,
          });
        } catch (error) {
          if (
            error instanceof CancelReservationBoundaryError &&
            error.code === "IDEMPOTENCY_CONFLICT"
          ) {
            const message =
              "La referencia de idempotencia ya fue utilizada con datos diferentes.";
            return Response.json(
              {
                ok: false,
                code: "IDEMPOTENCY_CONFLICT",
                error: message,
                mensaje: message,
              },
              { status: 409 },
            );
          }

          if (
            error instanceof CancelReservationBoundaryError &&
            error.code === "RESERVATION_NOT_FOUND"
          ) {
            const message = "Reserva no encontrada";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_NOT_FOUND",
                error: message,
                mensaje: message,
              },
              { status: 400 },
            );
          }

          if (
            error instanceof CancelReservationBoundaryError &&
            error.code === "RESERVATION_NOT_AVAILABLE"
          ) {
            const message = "La reserva ya no se puede cancelar.";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_NOT_AVAILABLE",
                error: message,
                mensaje: message,
              },
              { status: 400 },
            );
          }

          if (
            error instanceof CancelReservationBoundaryError &&
            error.code === "CANCEL_RETRY_EXHAUSTED"
          ) {
            const message =
              "No fue posible cancelar la reserva en este momento.";
            return Response.json(
              {
                ok: false,
                code: "RESERVATION_CANCEL_RETRY_EXHAUSTED",
                error: message,
                mensaje: message,
              },
              { status: 503 },
            );
          }

          const message = "No fue posible cancelar la reserva.";
          return Response.json(
            {
              ok: false,
              code: "INTERNAL_ERROR",
              error: message,
              mensaje: message,
            },
            { status: 500 },
          );
        }
      }

      default:
        return Response.json(
          {
            ok: false,
            error: "Acción no encontrada",
            mensaje: "Acción no encontrada",
            allowedActions: ALLOWED_ACTIONS,
          },
          { status: 404 },
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("Error en /api/asistente:", message);
    return Response.json({ error: message, mensaje: message }, { status: 400 });
  }
}

/* ============================================================
   FUNCIONES DE DATOS
============================================================ */

async function datosPerfil(negocio: NegocioLite) {
  return {
    mensaje:
      `¡Hola jefe de *${negocio.nombre}*! 👋\n\nTus datos:\n\n` +
      `📍 ${negocio.direccion || "Sin dirección"}\n` +
      `🌎 ${negocio.ciudad}\n` +
      `🌐 ${negocio.sitioWeb || "Sin web"}\n` +
      `🗺️ ${negocio.urlGoogleMaps || "Sin mapa"}\n\n` +
      `Tu perfil: https://myckeo.com/perfil/${negocio.slug}\n` +
      `QR: https://myckeo.com/dashboard/qr`,
    datos: negocio,
  };
}

async function resumenDia(negocioId: string) {
  const { startUtc: hoyUtc, endUtc: mananaUtc } = dayRangeUtcCO(0);

  const [reservas, pedidos, ingresos] = await Promise.all([
    prisma.reservation.count({
      where: { negocioId, fechaHoraInicio: { gte: hoyUtc, lt: mananaUtc } },
    }),
    prisma.order.count({
      where: { negocioId, createdAt: { gte: hoyUtc, lt: mananaUtc } },
    }),
    prisma.order.aggregate({
      where: { negocioId, createdAt: { gte: hoyUtc, lt: mananaUtc } },
      _sum: { totalAmount: true },
    }),
  ]);

  const ingresosHoy = moneyToNumber(ingresos._sum.totalAmount);

  return {
    mensaje:
      `Resumen de hoy ☀️\n\n` +
      `${reservas ? `📅 ${reservas} reservas` : "📅 Sin reservas"}\n` +
      `${pedidos ? `🛒 ${pedidos} pedidos` : "🛒 Sin pedidos"}\n` +
      `💰 Ingresos: $${ingresosHoy.toLocaleString("es-CO")}`,
    datos: { reservas, pedidos, ingresos: ingresosHoy },
  };
}

async function reservasHoy(negocioId: string) {
  const { startUtc: hoyUtc, endUtc: mananaUtc } = dayRangeUtcCO(0);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: hoyUtc, lt: mananaUtc } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 20,
  });

  if (!reservas.length)
    return { mensaje: "Hoy no tienes reservas programadas 😊", reservas: [] };

  const lista = reservas
    .map((r) => `• ${fmtCO(r.fechaHoraInicio, "hh:mm a")} - ${r.nombre}`)
    .join("\n");

  return {
    mensaje: `Reservas de hoy 📅\n\n${lista}\n\n¿Quieres ver detalles de alguna?`,
    reservas,
  };
}

async function reservasManana(negocioId: string) {
  const { startUtc: mananaUtc, endUtc: pasadoUtc } = dayRangeUtcCO(1);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: mananaUtc, lt: pasadoUtc } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 20,
  });

  if (!reservas.length)
    return { mensaje: "Mañana no tienes reservas 😊", reservas: [] };

  const lista = reservas
    .map((r) => `• ${fmtCO(r.fechaHoraInicio, "hh:mm a")} - ${r.nombre}`)
    .join("\n");

  return {
    mensaje: `Reservas para mañana 📅\n\n${lista}\n\n¿Quieres detalles de alguna?`,
    reservas,
  };
}

async function reservasProximas(negocioId: string) {
  const ahora = new Date();

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: ahora } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 25,
  });

  if (!reservas.length)
    return { mensaje: "No tienes reservas próximas 😊", reservas: [] };

  const lista = reservas
    .map(
      (r) =>
        `• ${fmtCO(r.fechaHoraInicio, "EEE d MMM, hh:mm a")} - ${r.nombre}`,
    )
    .join("\n");

  return {
    mensaje: `Próximas reservas 📅\n\n${lista}`,
    reservas,
  };
}

/* ============================================================
   PEDIDOS (con soporte a Decimal y a deliveryDate)
   - "Hoy": incluye (a) programados para hoy por deliveryDate, y (b) instantáneos por createdAt
   - "Mañana": por deliveryDate (programados)
   - "Próximos": por deliveryDate >= ahora (programados)
============================================================ */

type PedidoListItem = {
  id: string;
  createdAt: Date;
  totalAmount: Prisma.Decimal;
  datosDeEntrega: { deliveryDate: Date | null } | null;
  orderType: "DELIVERY" | "ON_SITE";
};

function pedidoDisplayDate(p: PedidoListItem): Date {
  return p.datosDeEntrega?.deliveryDate ?? p.createdAt;
}

async function pedidosHoy(negocioId: string) {
  const { startUtc: hoyUtc, endUtc: mananaUtc } = dayRangeUtcCO(0);

  const pedidos = await prisma.order.findMany({
    where: {
      negocioId,
      OR: [
        // (a) Programados para hoy (en CO)
        {
          datosDeEntrega: {
            is: { deliveryDate: { gte: hoyUtc, lt: mananaUtc } },
          },
        },
        // (b) Sin fecha programada: creados hoy (en CO)
        {
          createdAt: { gte: hoyUtc, lt: mananaUtc },
          OR: [
            { deliveryDataId: null },
            { datosDeEntrega: { is: { deliveryDate: null } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (!pedidos.length)
    return { mensaje: "Hoy no tienes pedidos 🛒", pedidos: [] };

  const lista = pedidos
    .map((p) => {
      const when = pedidoDisplayDate(p);
      return (
        `• ${fmtCO(when, "hh:mm a")} | ` +
        `#${p.id.slice(-6)} | $${formatMoney(p.totalAmount)}`
      );
    })
    .join("\n");

  return {
    mensaje: `Pedidos de hoy 🛒\n\n${lista}\n\n¿Quieres ver detalles de alguno?`,
    pedidos,
  };
}

function pedidoItemList(items: PedidoItem[]): string {
  return items
    .map((i) => {
      const name = i.product?.nombre || i.description || "Producto";
      return `${i.quantity}x ${name}`;
    })
    .join("\n");
}

async function detallePedido(negocioId: string, pedidoId: string) {
  const pedido = await prisma.order.findFirst({
    where: { id: pedidoId, negocioId },
    include: {
      items: { include: { product: true } },
      datosDeEntrega: true,
    },
  });

  if (!pedido) throw new Error("Pedido no encontrado");

  const itemsText = pedidoItemList(
    pedido.items.map((i) => ({
      quantity: i.quantity,
      description: i.description ?? null,
      product: i.product ? { nombre: i.product.nombre } : null,
    })),
  );

  const deliveryDate = pedido.datosDeEntrega?.deliveryDate ?? null;

  return {
    mensaje:
      `Pedido #${pedido.id.slice(-6)}\n\n` +
      `🛍️ Productos:\n${itemsText}\n\n` +
      `💰 Total: $${formatMoney(pedido.totalAmount)}\n\n` +
      (deliveryDate
        ? `🗓️ Entrega: ${fmtCO(deliveryDate, "EEE d MMM, hh:mm a")}\n`
        : "") +
      `📦 Cliente:\n${pedido.datosDeEntrega?.clientName || "N/D"} | ${
        pedido.datosDeEntrega?.clientPhone || ""
      }\n` +
      `${pedido.datosDeEntrega?.deliveryAddress || "Recoge en local"}\n\n` +
      `Estado: ${pedido.status}`,
    pedido,
  };
}

async function proximosPedidos(negocioId: string) {
  const ahora = new Date();

  const pedidos = await prisma.order.findMany({
    where: {
      negocioId,
      datosDeEntrega: { is: { deliveryDate: { gte: ahora } } },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: [
      { datosDeEntrega: { deliveryDate: "asc" } },
      { createdAt: "asc" },
    ],
    take: 25,
  });

  if (!pedidos.length) {
    return {
      mensaje: "No tienes pedidos próximos programados 😊",
      pedidos: [],
    };
  }

  const lista = pedidos
    .map((p) => {
      const when = pedidoDisplayDate(p);
      return (
        `• ${fmtCO(when, "EEE d MMM, hh:mm a")} | ` +
        `#${p.id.slice(-6)} | $${formatMoney(p.totalAmount)}`
      );
    })
    .join("\n");

  return {
    mensaje: `Próximos pedidos 🛒\n\n${lista}`,
    pedidos,
  };
}

async function pedidosManana(negocioId: string) {
  const { startUtc: mananaUtc, endUtc: pasadoUtc } = dayRangeUtcCO(1);

  const pedidos = await prisma.order.findMany({
    where: {
      negocioId,
      datosDeEntrega: {
        is: { deliveryDate: { gte: mananaUtc, lt: pasadoUtc } },
      },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: [
      { datosDeEntrega: { deliveryDate: "asc" } },
      { createdAt: "asc" },
    ],
    take: 20,
  });

  if (!pedidos.length)
    return { mensaje: "Mañana no tienes pedidos 🛒", pedidos: [] };

  const lista = pedidos
    .map((p) => {
      const when = pedidoDisplayDate(p);
      return (
        `• ${fmtCO(when, "hh:mm a")} | ` +
        `#${p.id.slice(-6)} | $${formatMoney(p.totalAmount)}`
      );
    })
    .join("\n");

  return {
    mensaje: `Pedidos para mañana 🛒\n\n${lista}\n\n¿Quieres ver detalles de alguno?`,
    pedidos,
  };
}

async function detalleReserva(negocioId: string, reservaId: string) {
  const reserva = await prisma.reservation.findFirst({
    where: { id: reservaId, negocioId },
  });

  if (!reserva) throw new Error("Reserva no encontrada");

  return {
    mensaje:
      `Reserva de ${reserva.nombre}\n\n` +
      `📅 ${fmtCO(reserva.fechaHoraInicio, "EEEE d 'de' MMMM, hh:mm a")}\n` +
      `📞 ${reserva.telefono}\n` +
      `📝 ${reserva.notas || "Sin notas"}\n\n` +
      `Estado: ${reserva.estado}`,
    reserva,
  };
}

async function estadisticasSemana(negocioId: string) {
  const inicioSemanaUtc = startOfWeekUtcCO();

  const [pedidos, ingresos] = await Promise.all([
    prisma.order.count({
      where: { negocioId, createdAt: { gte: inicioSemanaUtc } },
    }),
    prisma.order.aggregate({
      where: { negocioId, createdAt: { gte: inicioSemanaUtc } },
      _sum: { totalAmount: true },
    }),
  ]);

  const ingresosSemana = moneyToNumber(ingresos._sum.totalAmount);

  return {
    mensaje:
      `Estadísticas de esta semana 📊\n\n` +
      `• ${pedidos} pedidos\n` +
      `• Ingresos: $${ingresosSemana.toLocaleString("es-CO")}\n`,
    datos: { pedidos, ingresos: ingresosSemana },
  };
}
