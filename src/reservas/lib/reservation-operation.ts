import "server-only";

import { createHash } from "node:crypto";

import { ReservationOperationAction, ReservationStatus } from "@prisma/client";

const RESERVATION_OPERATION_FINGERPRINT_PREFIX =
  "myckeo:reservation-operation:v1\n";
const RESERVATION_OPERATION_SOURCE_REFERENCE_MAX_LENGTH = 255;
const RESERVATION_OPERATION_SOURCE_REFERENCE_CONTROL_PATTERN =
  /[\u0000-\u001F\u007F-\u009F]/;
const RESERVATION_OPERATION_PHONE_INPUT_PATTERN = /^\+?[\d\s().-]+$/;
const RESERVATION_OPERATION_PHONE_PATTERN = /^\+\d{10,15}$/;

const ALLOWED_RESERVATION_OPERATION_ACTIONS = new Set<string>([
  ReservationOperationAction.CREATE,
  ReservationOperationAction.UPDATE,
  ReservationOperationAction.CANCEL,
]);

const ALLOWED_CUSTOMER_RESERVATION_STATUSES = new Set<string>([
  ReservationStatus.PENDIENTE,
  ReservationStatus.CONFIRMADA,
  ReservationStatus.CANCELADA,
  ReservationStatus.COMPLETADA,
]);

const INVALID_NORMALIZED_VALUE = Symbol("INVALID_NORMALIZED_VALUE");

type InvalidNormalizedValue = typeof INVALID_NORMALIZED_VALUE;
type PlainRecord = Record<string, unknown>;

type CreateAction = (typeof ReservationOperationAction)["CREATE"];
type UpdateAction = (typeof ReservationOperationAction)["UPDATE"];
type CancelAction = (typeof ReservationOperationAction)["CANCEL"];

export type ReservationOperationCustomerStatus =
  | (typeof ReservationStatus)["PENDIENTE"]
  | (typeof ReservationStatus)["CONFIRMADA"]
  | (typeof ReservationStatus)["CANCELADA"]
  | (typeof ReservationStatus)["COMPLETADA"];

export type ReservationOperationFingerprintInput = {
  action: ReservationOperationAction;
  payload: unknown;
};

export type ReservationOperationFingerprintResult<
  TAction extends ReservationOperationAction,
  TPayload,
> = {
  action: TAction;
  payload: TPayload;
  fingerprint: string;
};

export type ReservationCreateOperationPayload = {
  nombreCliente: string;
  telefonoCliente: string;
  fechaHoraInicio: string;
  fechaHoraFin: string | null;
  notas: string | null;
  estado: ReservationOperationCustomerStatus;
  permitirSobrecupo: boolean;
};

export type ReservationUpdateOperationChanges = {
  nombreCliente?: string;
  telefonoCliente?: string;
  fechaHoraInicio?: string;
  fechaHoraFin?: string | null;
  notas?: string | null;
  estado?: ReservationOperationCustomerStatus;
};

export type ReservationUpdateOperationPayload = {
  reservaId: string;
  cambios: ReservationUpdateOperationChanges;
  permitirSobrecupo: boolean;
};

export type ReservationCancelOperationPayload = {
  reservaId: string;
  motivo: string | null;
};

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function throwCanonicalizationError(): never {
  throw new TypeError(
    "Reservation operation fingerprint value is not canonicalizable.",
  );
}

function assertPlainDataProperties(record: PlainRecord): string[] {
  if (Object.getOwnPropertySymbols(record).length > 0) {
    throwCanonicalizationError();
  }

  const propertyNames = Object.getOwnPropertyNames(record);
  for (const propertyName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(record, propertyName);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throwCanonicalizationError();
    }
  }

  return propertyNames.sort();
}

function assertPlainArray(value: unknown[]): void {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throwCanonicalizationError();
  }

  for (const key of Object.keys(value)) {
    const index = Number(key);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= value.length ||
      String(index) !== key
    ) {
      throwCanonicalizationError();
    }
  }
}

function canonicalizeValue(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throwCanonicalizationError();
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) throwCanonicalizationError();
    assertPlainArray(value);
    ancestors.add(value);

    try {
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!hasOwn(value as unknown as PlainRecord, String(index))) {
          throwCanonicalizationError();
        }

        const item = value[index];
        if (item === undefined) throwCanonicalizationError();
        items.push(canonicalizeValue(item, ancestors));
      }

      return `[${items.join(",")}]`;
    } finally {
      ancestors.delete(value);
    }
  }

  if (isPlainRecord(value)) {
    if (ancestors.has(value)) throwCanonicalizationError();
    const keys = assertPlainDataProperties(value);
    ancestors.add(value);

    try {
      const properties: string[] = [];
      for (const key of keys) {
        const propertyValue = value[key];
        if (propertyValue === undefined) continue;

        properties.push(
          `${JSON.stringify(key)}:${canonicalizeValue(propertyValue, ancestors)}`,
        );
      }

      return `{${properties.join(",")}}`;
    } finally {
      ancestors.delete(value);
    }
  }

  return throwCanonicalizationError();
}

export function canonicalizeReservationOperationValue(value: unknown): string {
  return canonicalizeValue(value, new Set<object>());
}

function isReservationOperationAction(
  value: unknown,
): value is ReservationOperationAction {
  return (
    typeof value === "string" &&
    ALLOWED_RESERVATION_OPERATION_ACTIONS.has(value)
  );
}

export function createReservationOperationFingerprint(
  input: ReservationOperationFingerprintInput,
): string {
  if (!isPlainRecord(input)) {
    throwCanonicalizationError();
  }

  const inputKeys = assertPlainDataProperties(input);
  if (
    inputKeys.length !== 2 ||
    inputKeys[0] !== "action" ||
    inputKeys[1] !== "payload" ||
    !isReservationOperationAction(input.action)
  ) {
    throwCanonicalizationError();
  }

  const canonicalDocument = canonicalizeReservationOperationValue({
    action: input.action,
    payload: input.payload,
  });
  const digest = createHash("sha256")
    .update(
      `${RESERVATION_OPERATION_FINGERPRINT_PREFIX}${canonicalDocument}`,
      "utf8",
    )
    .digest("hex");

  return `v1:${digest}`;
}

export function isValidReservationOperationSourceReference(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= RESERVATION_OPERATION_SOURCE_REFERENCE_MAX_LENGTH &&
    value === value.trim() &&
    !RESERVATION_OPERATION_SOURCE_REFERENCE_CONTROL_PATTERN.test(value)
  );
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeNullableText(
  value: unknown,
): string | null | InvalidNormalizedValue {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return INVALID_NORMALIZED_VALUE;

  const normalized = value.trim();
  return normalized || null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || !RESERVATION_OPERATION_PHONE_INPUT_PATTERN.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  const normalizedDigits = digits.length === 10 ? `57${digits}` : digits;
  const normalized = `+${normalizedDigits}`;
  return RESERVATION_OPERATION_PHONE_PATTERN.test(normalized)
    ? normalized
    : null;
}

function normalizeDate(value: unknown): string | null {
  if (
    !(value instanceof Date) &&
    (typeof value !== "string" || !value.trim())
  ) {
    return null;
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value.trim());

  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeCustomerReservationStatus(
  value: unknown,
): ReservationOperationCustomerStatus | null {
  return typeof value === "string" &&
    ALLOWED_CUSTOMER_RESERVATION_STATUSES.has(value)
    ? (value as ReservationOperationCustomerStatus)
    : null;
}

function normalizeBooleanWithDefault(
  record: PlainRecord,
  key: string,
): boolean | InvalidNormalizedValue {
  if (!hasOwn(record, key)) return false;
  return typeof record[key] === "boolean"
    ? record[key]
    : INVALID_NORMALIZED_VALUE;
}

function buildFingerprintResult<
  TAction extends ReservationOperationAction,
  TPayload,
>(
  action: TAction,
  payload: TPayload,
): ReservationOperationFingerprintResult<TAction, TPayload> {
  return {
    action,
    payload,
    fingerprint: createReservationOperationFingerprint({ action, payload }),
  };
}

export function buildCreateReservationOperationFingerprint(
  input: unknown,
): ReservationOperationFingerprintResult<
  CreateAction,
  ReservationCreateOperationPayload
> | null {
  if (!isPlainRecord(input)) return null;
  if (
    !hasOwn(input, "nombreCliente") ||
    !hasOwn(input, "telefonoCliente") ||
    !hasOwn(input, "fechaHoraInicio")
  ) {
    return null;
  }

  const nombreCliente = normalizeRequiredText(input.nombreCliente);
  const telefonoCliente = normalizePhone(input.telefonoCliente);
  const fechaHoraInicio = normalizeDate(input.fechaHoraInicio);
  if (!nombreCliente || !telefonoCliente || !fechaHoraInicio) return null;

  const rawFechaHoraFin = hasOwn(input, "fechaHoraFin")
    ? input.fechaHoraFin
    : undefined;
  let fechaHoraFin: string | null = null;
  if (rawFechaHoraFin !== undefined && rawFechaHoraFin !== null) {
    fechaHoraFin = normalizeDate(rawFechaHoraFin);
    if (!fechaHoraFin) return null;
  }

  const notas = normalizeNullableText(
    hasOwn(input, "notas") ? input.notas : undefined,
  );
  if (notas === INVALID_NORMALIZED_VALUE) return null;

  let estado: ReservationOperationCustomerStatus = ReservationStatus.PENDIENTE;
  if (hasOwn(input, "estado")) {
    const normalizedStatus = normalizeCustomerReservationStatus(input.estado);
    if (!normalizedStatus) return null;
    estado = normalizedStatus;
  }

  const permitirSobrecupo = normalizeBooleanWithDefault(
    input,
    "permitirSobrecupo",
  );
  if (permitirSobrecupo === INVALID_NORMALIZED_VALUE) return null;

  return buildFingerprintResult(ReservationOperationAction.CREATE, {
    nombreCliente,
    telefonoCliente,
    fechaHoraInicio,
    fechaHoraFin,
    notas,
    estado,
    permitirSobrecupo,
  });
}

export function buildUpdateReservationOperationFingerprint(
  input: unknown,
): ReservationOperationFingerprintResult<
  UpdateAction,
  ReservationUpdateOperationPayload
> | null {
  if (!isPlainRecord(input) || !hasOwn(input, "reservaId")) return null;

  const reservaId = normalizeRequiredText(input.reservaId);
  if (!reservaId) return null;

  const cambios: ReservationUpdateOperationChanges = {};

  if (hasOwn(input, "nombreCliente")) {
    const nombreCliente = normalizeRequiredText(input.nombreCliente);
    if (!nombreCliente) return null;
    cambios.nombreCliente = nombreCliente;
  }

  if (hasOwn(input, "telefonoCliente")) {
    const telefonoCliente = normalizePhone(input.telefonoCliente);
    if (!telefonoCliente) return null;
    cambios.telefonoCliente = telefonoCliente;
  }

  if (hasOwn(input, "fechaHoraInicio")) {
    const fechaHoraInicio = normalizeDate(input.fechaHoraInicio);
    if (!fechaHoraInicio) return null;
    cambios.fechaHoraInicio = fechaHoraInicio;
  }

  if (hasOwn(input, "fechaHoraFin")) {
    if (input.fechaHoraFin === null) {
      cambios.fechaHoraFin = null;
    } else {
      const fechaHoraFin = normalizeDate(input.fechaHoraFin);
      if (!fechaHoraFin) return null;
      cambios.fechaHoraFin = fechaHoraFin;
    }
  }

  if (hasOwn(input, "notas")) {
    if (input.notas === undefined) return null;
    const notas = normalizeNullableText(input.notas);
    if (notas === INVALID_NORMALIZED_VALUE) return null;
    cambios.notas = notas;
  }

  if (hasOwn(input, "estado")) {
    const estado = normalizeCustomerReservationStatus(input.estado);
    if (!estado) return null;
    cambios.estado = estado;
  }

  if (Object.keys(cambios).length === 0) return null;

  const permitirSobrecupo = normalizeBooleanWithDefault(
    input,
    "permitirSobrecupo",
  );
  if (permitirSobrecupo === INVALID_NORMALIZED_VALUE) return null;

  return buildFingerprintResult(ReservationOperationAction.UPDATE, {
    reservaId,
    cambios,
    permitirSobrecupo,
  });
}

export function buildCancelReservationOperationFingerprint(
  input: unknown,
): ReservationOperationFingerprintResult<
  CancelAction,
  ReservationCancelOperationPayload
> | null {
  if (!isPlainRecord(input) || !hasOwn(input, "reservaId")) return null;

  const reservaId = normalizeRequiredText(input.reservaId);
  if (!reservaId) return null;

  const motivo = normalizeNullableText(
    hasOwn(input, "notas") ? input.notas : undefined,
  );
  if (motivo === INVALID_NORMALIZED_VALUE) return null;

  return buildFingerprintResult(ReservationOperationAction.CANCEL, {
    reservaId,
    motivo,
  });
}
