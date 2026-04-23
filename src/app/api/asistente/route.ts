// app/api/asistente/route.ts

import prisma from "@/lib/prisma";
import { buildPublicBusinessVisibilityWhere } from "@/lib/business/publicBusinessVisibility";
import { ReservationStatus, type Prisma } from "@prisma/client";
import { startOfDay, addDays, addMinutes, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error(
    "No es correcta o no está definida la api key de administrador."
  );
}

/* ============================================================
   TIMEZONE (Colombia)
============================================================ */

const TZ = "America/Bogota";

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

function asNullableTrimmedString(
  value: unknown
): string | null | undefined {
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
  keys: string[]
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

function parseDateInput(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} inválida. Usa formato ISO 8601.`);
  }

  return date;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function defaultReservationDurationMinutes(
  config: BusinessAvailabilityLite | null
): number {
  const intervalo = config?.intervaloMinutos ?? 30;
  const bloques = config?.duracionMinimaIntervalos ?? 1;
  return Math.max(intervalo * bloques, 5);
}

function buildCoveredSlotRanges(
  start: Date,
  end: Date,
  intervalMinutes: number
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const slotEnd = addMinutes(cursor, intervalMinutes);
    slots.push({
      start: new Date(cursor),
      end: slotEnd,
    });
    cursor = slotEnd;
  }

  return slots;
}

function resolveCreateReservationEnd(
  start: Date,
  explicitEnd: string | null | undefined,
  config: BusinessAvailabilityLite | null
): Date {
  if (explicitEnd) {
    return parseDateInput(explicitEnd, "fechaHoraFin");
  }

  return addMinutes(start, defaultReservationDurationMinutes(config));
}

function resolveUpdatedReservationEnd(args: {
  existingStart: Date;
  existingEnd: Date | null;
  nextStart: Date;
  explicitEnd: string | null | undefined;
  hasFechaHoraInicio: boolean;
  hasFechaHoraFin: boolean;
  config: BusinessAvailabilityLite | null;
}): Date | null {
  const {
    existingStart,
    existingEnd,
    nextStart,
    explicitEnd,
    hasFechaHoraInicio,
    hasFechaHoraFin,
    config,
  } = args;

  if (hasFechaHoraFin && explicitEnd) {
    return parseDateInput(explicitEnd, "fechaHoraFin");
  }

  if (hasFechaHoraFin || hasFechaHoraInicio) {
    if (existingEnd) {
      const durationMs = existingEnd.getTime() - existingStart.getTime();
      if (durationMs > 0) {
        return new Date(nextStart.getTime() + durationMs);
      }
    }

    return addMinutes(nextStart, defaultReservationDurationMinutes(config));
  }

  if (existingEnd) {
    return existingEnd;
  }

  return null;
}

function validateReservationAgainstAvailability(
  config: BusinessAvailabilityLite,
  start: Date,
  end: Date
) {
  if (end <= start) {
    throw new Error("fechaHoraFin debe ser posterior a fechaHoraInicio.");
  }

  const startDay = fmtCO(start, "yyyy-MM-dd");
  const endDay = fmtCO(end, "yyyy-MM-dd");
  if (startDay !== endDay) {
    throw new Error(
      "La reserva debe iniciar y terminar el mismo día en hora Colombia."
    );
  }

  const dayName = capitalize(fmtCO(start, "EEEE"));
  if (!config.diasAtencion.includes(dayName)) {
    throw new Error(
      `El negocio no atiende los ${dayName.toLowerCase()}.`
    );
  }

  const startTime = fmtCO(start, "HH:mm");
  const endTime = fmtCO(end, "HH:mm");
  const startMinutes = hhmmToMinutes(startTime);
  const endMinutes = hhmmToMinutes(endTime);
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes <= 0) {
    throw new Error("La duración de la reserva debe ser mayor a cero.");
  }

  const fitsRange = (rangeStart: string | null, rangeEnd: string | null) => {
    if (!rangeStart || !rangeEnd) return false;

    const rangeStartMinutes = hhmmToMinutes(rangeStart);
    const rangeEndMinutes = hhmmToMinutes(rangeEnd);

    if (startMinutes < rangeStartMinutes || endMinutes > rangeEndMinutes) {
      return false;
    }

    if ((startMinutes - rangeStartMinutes) % config.intervaloMinutos !== 0) {
      return false;
    }

    return durationMinutes % config.intervaloMinutos === 0;
  };

  if (
    !fitsRange(config.franjaMananaInicio, config.franjaMananaFin) &&
    !fitsRange(config.franjaTardeInicio, config.franjaTardeFin)
  ) {
    throw new Error(
      "La reserva no cae en una franja válida o no coincide con el intervalo configurado."
    );
  }
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
  telefonoRaw: string
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

async function getBusinessAvailability(
  negocioId: string
): Promise<BusinessAvailabilityLite | null> {
  return prisma.businessAvailability.findUnique({
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
}

async function assertReservationCapacity(args: {
  negocioId: string;
  start: Date;
  end: Date;
  config: BusinessAvailabilityLite;
  excludeReservationId?: string;
}) {
  const { negocioId, start, end, config, excludeReservationId } = args;
  const slotRanges = buildCoveredSlotRanges(start, end, config.intervaloMinutos);

  const counts = await Promise.all(
    slotRanges.map((slot) =>
      prisma.reservation.count({
        where: {
          negocioId,
          fechaHoraInicio: { gte: slot.start, lt: slot.end },
          estado: {
            notIn: [ReservationStatus.CANCELADA, ReservationStatus.BLOQUEADA],
          },
          ...(excludeReservationId
            ? { id: { not: excludeReservationId } }
            : {}),
        },
      })
    )
  );

  const exceededIndex = counts.findIndex(
    (count) => count >= config.capacidadPorIntervalo
  );

  if (exceededIndex >= 0) {
    const slotStart = slotRanges[exceededIndex]?.start ?? start;
    throw new Error(
      `El horario ${fmtCO(
        slotStart,
        "hh:mm a"
      )} ya alcanzó la capacidad máxima (${config.capacidadPorIntervalo}).`
    );
  }
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
  }
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
      "EEEE d 'de' MMMM, hh:mm a"
    )}${rangoFin}\n` +
    `📝 ${reserva.notas || "Sin notas"}\n` +
    `Estado: ${reserva.estado}`
  );
}

function buildCancellationNotes(
  currentNotes: string | null,
  reason: string | null | undefined
): string | null {
  const cancellationLabel = reason
    ? `Cancelada por asistente: ${reason}`
    : "Cancelada por asistente";

  return currentNotes ? `${currentNotes}\n${cancellationLabel}` : cancellationLabel;
}

async function crearReservaAsistente(
  negocioId: string,
  input: Pick<
    ReservationMutationInput,
    | "nombreCliente"
    | "telefonoCliente"
    | "fechaHoraInicio"
    | "fechaHoraFin"
    | "notas"
    | "estado"
    | "permitirSobrecupo"
  >
) {
  const config = await getBusinessAvailability(negocioId);
  const nombreCliente = asNonEmptyString(input.nombreCliente);
  const telefonoCliente = input.telefonoCliente
    ? normalizePhone(input.telefonoCliente)
    : "";

  if (!nombreCliente) {
    throw new Error("nombreCliente requerido");
  }

  if (!telefonoCliente) {
    throw new Error("telefonoCliente inválido");
  }

  if (!input.fechaHoraInicio) {
    throw new Error("fechaHoraInicio requerida");
  }

  const start = parseDateInput(input.fechaHoraInicio, "fechaHoraInicio");
  const end = resolveCreateReservationEnd(start, input.fechaHoraFin, config);

  if (config) {
    validateReservationAgainstAvailability(config, start, end);

    if (
      !input.permitirSobrecupo &&
      input.estado !== ReservationStatus.CANCELADA
    ) {
      await assertReservationCapacity({
        negocioId,
        start,
        end,
        config,
      });
    }
  }

  const reserva = await prisma.reservation.create({
    data: {
      negocioId,
      nombre: nombreCliente,
      telefono: telefonoCliente,
      fechaHoraInicio: start,
      fechaHoraFin: end,
      notas: input.notas ?? null,
      estado: input.estado ?? ReservationStatus.PENDIENTE,
    },
  });

  return {
    ok: true,
    mensaje: buildReservationMessage("Reserva creada exitosamente ✅", reserva),
    reserva,
  };
}

async function modificarReservaAsistente(
  negocioId: string,
  reservaId: string,
  input: ReservationMutationInput
) {
  const reservaActual = await prisma.reservation.findFirst({
    where: { id: reservaId, negocioId },
  });

  if (!reservaActual) {
    throw new Error("Reserva no encontrada");
  }

  const config = await getBusinessAvailability(negocioId);
  const nextStart = input.hasFechaHoraInicio && input.fechaHoraInicio
    ? parseDateInput(input.fechaHoraInicio, "fechaHoraInicio")
    : reservaActual.fechaHoraInicio;
  const nextEnd = resolveUpdatedReservationEnd({
    existingStart: reservaActual.fechaHoraInicio,
    existingEnd: reservaActual.fechaHoraFin,
    nextStart,
    explicitEnd: input.fechaHoraFin,
    hasFechaHoraInicio: input.hasFechaHoraInicio,
    hasFechaHoraFin: input.hasFechaHoraFin,
    config,
  });
  const effectiveEnd =
    nextEnd ?? addMinutes(nextStart, defaultReservationDurationMinutes(config));
  const nextNombre = input.hasNombreCliente
    ? input.nombreCliente
    : reservaActual.nombre;
  const nextTelefono = input.hasTelefonoCliente && input.telefonoCliente
    ? normalizePhone(input.telefonoCliente)
    : reservaActual.telefono;
  const nextEstado = input.hasEstado
    ? input.estado ?? reservaActual.estado
    : reservaActual.estado;
  const nextNotas = input.hasNotas
    ? input.notas ?? null
    : reservaActual.notas;

  if (!nextNombre) {
    throw new Error("nombreCliente inválido");
  }

  if (!nextTelefono) {
    throw new Error("telefonoCliente inválido");
  }

  const shouldValidateSchedule = Boolean(
    config && (input.hasFechaHoraInicio || input.hasFechaHoraFin)
  );
  const shouldValidateCapacity = Boolean(
    config &&
      !input.permitirSobrecupo &&
      nextEstado !== ReservationStatus.CANCELADA &&
      (input.hasFechaHoraInicio ||
        input.hasFechaHoraFin ||
        (input.hasEstado &&
          reservaActual.estado === ReservationStatus.CANCELADA))
  );

  if (config && shouldValidateSchedule) {
    validateReservationAgainstAvailability(config, nextStart, effectiveEnd);
  }

  if (config && shouldValidateCapacity) {
    await assertReservationCapacity({
      negocioId,
      start: nextStart,
      end: effectiveEnd,
      config,
      excludeReservationId: reservaId,
    });
  }

  const reserva = await prisma.reservation.update({
    where: { id: reservaId },
    data: {
      nombre: nextNombre,
      telefono: nextTelefono,
      fechaHoraInicio: nextStart,
      fechaHoraFin: nextEnd,
      notas: nextNotas,
      estado: nextEstado,
    },
  });

  return {
    ok: true,
    mensaje: buildReservationMessage(
      "Reserva actualizada exitosamente ✏️",
      reserva
    ),
    reserva,
  };
}

async function cancelarReservaAsistente(
  negocioId: string,
  reservaId: string,
  reason?: string | null
) {
  const reservaActual = await prisma.reservation.findFirst({
    where: { id: reservaId, negocioId },
  });

  if (!reservaActual) {
    throw new Error("Reserva no encontrada");
  }

  const reserva = await prisma.reservation.update({
    where: { id: reservaId },
    data: {
      estado: ReservationStatus.CANCELADA,
      notas: buildCancellationNotes(reservaActual.notas, reason),
    },
  });

  return {
    ok: true,
    mensaje: buildReservationMessage(
      "Reserva cancelada exitosamente ❌",
      reserva
    ),
    reserva,
  };
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
        { status: 400 }
      );
    }

    const actionRaw = rawBody.action;

    // Soportar key por body o por header (compatibilidad con agentes)
    const headerKey = asNonEmptyString(request.headers.get("x-api-key"));
    const key = asNonEmptyString(rawBody.key) ?? headerKey;

    const telefono = asNonEmptyString(rawBody.telefono);
    const pedidoId = asNonEmptyString(rawBody.pedidoId);
    const reservaId = asNonEmptyString(rawBody.reservaId);
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
        { status: 401 }
      );
    }

    if (!telefono) {
      return Response.json(
        {
          error: "Falta telefono en el body",
          mensaje: "Falta telefono en el body",
        },
        { status: 400 }
      );
    }

    if (hasNombreCliente && !nombreCliente) {
      return Response.json(
        {
          error: "nombreCliente inválido",
          mensaje: "nombreCliente inválido",
        },
        { status: 400 }
      );
    }

    if (hasTelefonoCliente && !telefonoCliente) {
      return Response.json(
        {
          error: "telefonoCliente inválido",
          mensaje: "telefonoCliente inválido",
        },
        { status: 400 }
      );
    }

    if (hasFechaHoraInicio && !fechaHoraInicio) {
      return Response.json(
        {
          error: "fechaHoraInicio inválida",
          mensaje: "fechaHoraInicio inválida",
        },
        { status: 400 }
      );
    }

    if (hasFechaHoraFin && fechaHoraFin === undefined) {
      return Response.json(
        {
          error: "fechaHoraFin inválida",
          mensaje: "fechaHoraFin inválida",
        },
        { status: 400 }
      );
    }

    if (hasNotas && notas === undefined) {
      return Response.json(
        {
          error: "notas inválidas",
          mensaje: "notas inválidas",
        },
        { status: 400 }
      );
    }

    if (hasEstado && !estado) {
      return Response.json(
        {
          error: "estado inválido",
          mensaje:
            "estado inválido. Usa PENDIENTE, CONFIRMADA, CANCELADA o COMPLETADA.",
        },
        { status: 400 }
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
        { status: 404 }
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
        { status: 404 }
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
            { status: 400 }
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
            { status: 400 }
          );
        }
        return Response.json({
          ...baseMeta,
          ...(await detalleReserva(negocio.id, body.reservaId)),
        });

      case "crear-reserva":
        if (!body.nombreCliente || !body.telefonoCliente || !body.fechaHoraInicio) {
          return Response.json(
            {
              error:
                "nombreCliente, telefonoCliente y fechaHoraInicio son requeridos",
              mensaje:
                "nombreCliente, telefonoCliente y fechaHoraInicio son requeridos",
            },
            { status: 400 }
          );
        }
        return Response.json(
          {
            ...baseMeta,
            ...(await crearReservaAsistente(negocio.id, {
              nombreCliente: body.nombreCliente,
              telefonoCliente: body.telefonoCliente,
              fechaHoraInicio: body.fechaHoraInicio,
              fechaHoraFin: body.fechaHoraFin,
              notas: body.notas,
              estado: body.estado,
              permitirSobrecupo: body.permitirSobrecupo,
            })),
          },
          { status: 201 }
        );

      case "modificar-reserva":
        if (!body.reservaId) {
          return Response.json(
            { error: "reservaId requerido", mensaje: "reservaId requerido" },
            { status: 400 }
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
              error: "No hay cambios para aplicar",
              mensaje:
                "Envía al menos uno de estos campos: nombreCliente, telefonoCliente, fechaHoraInicio, fechaHoraFin, notas o estado.",
            },
            { status: 400 }
          );
        }
        return Response.json({
          ...baseMeta,
          ...(await modificarReservaAsistente(
            negocio.id,
            body.reservaId,
            body
          )),
        });

      case "cancelar-reserva":
        if (!body.reservaId) {
          return Response.json(
            { error: "reservaId requerido", mensaje: "reservaId requerido" },
            { status: 400 }
          );
        }
        return Response.json({
          ...baseMeta,
          ...(await cancelarReservaAsistente(
            negocio.id,
            body.reservaId,
            body.hasNotas ? body.notas : undefined
          )),
        });

      default:
        return Response.json(
          {
            ok: false,
            error: "Acción no encontrada",
            mensaje: "Acción no encontrada",
            allowedActions: ALLOWED_ACTIONS,
          },
          { status: 404 }
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
      (r) => `• ${fmtCO(r.fechaHoraInicio, "EEE d MMM, hh:mm a")} - ${r.nombre}`
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

  if (!pedidos.length) return { mensaje: "Hoy no tienes pedidos 🛒", pedidos: [] };

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
    }))
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
    orderBy: [{ datosDeEntrega: { deliveryDate: "asc" } }, { createdAt: "asc" }],
    take: 25,
  });

  if (!pedidos.length) {
    return { mensaje: "No tienes pedidos próximos programados 😊", pedidos: [] };
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
      datosDeEntrega: { is: { deliveryDate: { gte: mananaUtc, lt: pasadoUtc } } },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: [{ datosDeEntrega: { deliveryDate: "asc" } }, { createdAt: "asc" }],
    take: 20,
  });

  if (!pedidos.length) return { mensaje: "Mañana no tienes pedidos 🛒", pedidos: [] };

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
