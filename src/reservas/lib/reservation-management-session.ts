import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const RESERVATION_MANAGEMENT_SESSION_TTL_MS = 30 * 60 * 1000;
const RESERVATION_MANAGEMENT_SESSION_MAX_LENGTH = 1024;
const RESERVATION_MANAGEMENT_COOKIE_NAME =
  "myckeo-reservation-management";
const RESERVATION_MANAGEMENT_COOKIE_PATH = "/reservas/gestionar";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const HMAC_SHA256_BASE64URL_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CAPABILITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

type ReservationManagementSessionErrorCode =
  | "RESERVATION_MANAGEMENT_SECRET_INVALID"
  | "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID"
  | "RESERVATION_MANAGEMENT_COOKIE_EXPIRY_INVALID";

class ReservationManagementSessionError extends Error {
  readonly code: ReservationManagementSessionErrorCode;

  constructor(code: ReservationManagementSessionErrorCode) {
    super("Reservation management session operation failed.");
    this.name = "ReservationManagementSessionError";
    this.code = code;
  }
}

export type CreateReservationManagementSessionInput = {
  capabilityId: string;
  capabilityExpiresAt: Date;
};

export type ReservationManagementSessionResult = {
  value: string;
  expiresAt: Date;
};

export type VerifiedReservationManagementSession = {
  capabilityId: string;
  expiresAt: Date;
};

export type ReservationManagementCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  expires: Date;
};

export type ReservationManagementCookieClearOptions =
  ReservationManagementCookieOptions & {
    maxAge: 0;
  };

type ReservationManagementSessionPayload = {
  v: 1;
  capabilityId: string;
  exp: number;
};

function decodeCanonicalBase64url(value: string): Buffer | null {
  if (
    !value ||
    !BASE64URL_PATTERN.test(value) ||
    value.length % 4 === 1
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function getReservationManagementSecret(): Buffer {
  const secret = process.env.RESERVATION_MANAGEMENT_SECRET;
  const secretBytes =
    typeof secret === "string" ? decodeCanonicalBase64url(secret) : null;

  if (!secretBytes || secretBytes.length < 32) {
    throw new ReservationManagementSessionError(
      "RESERVATION_MANAGEMENT_SECRET_INVALID",
    );
  }

  return secretBytes;
}

function getValidDateTimestamp(value: unknown): number | null {
  if (!(value instanceof Date)) {
    return null;
  }

  const timestamp = value.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getReservationManagementCookieBaseOptions(): Omit<
  ReservationManagementCookieOptions,
  "expires"
> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: RESERVATION_MANAGEMENT_COOKIE_PATH,
  };
}

function isValidCapabilityId(value: unknown): value is string {
  return typeof value === "string" && CAPABILITY_ID_PATTERN.test(value);
}

function createSignature(content: string, secret: Buffer): Buffer {
  return createHmac("sha256", secret).update(content).digest();
}

function isStrictPayload(
  value: unknown,
): value is ReservationManagementSessionPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload);

  return (
    keys.length === 3 &&
    keys.includes("v") &&
    keys.includes("capabilityId") &&
    keys.includes("exp") &&
    payload.v === 1 &&
    isValidCapabilityId(payload.capabilityId) &&
    Number.isSafeInteger(payload.exp) &&
    typeof payload.exp === "number" &&
    payload.exp > 0
  );
}

export function getReservationManagementCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? `__Secure-${RESERVATION_MANAGEMENT_COOKIE_NAME}`
    : RESERVATION_MANAGEMENT_COOKIE_NAME;
}

export function getReservationManagementCookieOptions(
  expiresAt: Date,
): ReservationManagementCookieOptions {
  const expiresAtTimestamp = getValidDateTimestamp(expiresAt);

  if (expiresAtTimestamp === null || expiresAtTimestamp <= Date.now()) {
    throw new ReservationManagementSessionError(
      "RESERVATION_MANAGEMENT_COOKIE_EXPIRY_INVALID",
    );
  }

  return {
    ...getReservationManagementCookieBaseOptions(),
    expires: new Date(expiresAtTimestamp),
  };
}

export function getReservationManagementCookieClearOptions(): ReservationManagementCookieClearOptions {
  return {
    ...getReservationManagementCookieBaseOptions(),
    expires: new Date(0),
    maxAge: 0,
  };
}

export function createReservationManagementSession(
  input: CreateReservationManagementSessionInput,
  now: Date = new Date(),
): ReservationManagementSessionResult {
  const secret = getReservationManagementSecret();
  const nowTimestamp = getValidDateTimestamp(now);
  const capabilityExpiresAtTimestamp = getValidDateTimestamp(
    input?.capabilityExpiresAt,
  );

  if (
    !isValidCapabilityId(input?.capabilityId) ||
    nowTimestamp === null ||
    capabilityExpiresAtTimestamp === null ||
    capabilityExpiresAtTimestamp <= nowTimestamp
  ) {
    throw new ReservationManagementSessionError(
      "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
    );
  }

  const sessionLimitTimestamp =
    nowTimestamp + RESERVATION_MANAGEMENT_SESSION_TTL_MS;
  const effectiveExpiresAtTimestamp = Math.min(
    sessionLimitTimestamp,
    capabilityExpiresAtTimestamp,
  );
  const exp = Math.floor(effectiveExpiresAtTimestamp / 1000);
  const signedExpiresAtTimestamp = exp * 1000;

  if (
    !Number.isSafeInteger(sessionLimitTimestamp) ||
    !Number.isSafeInteger(exp) ||
    exp <= 0 ||
    !Number.isSafeInteger(signedExpiresAtTimestamp) ||
    signedExpiresAtTimestamp <= nowTimestamp
  ) {
    throw new ReservationManagementSessionError(
      "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
    );
  }

  const expiresAt = new Date(signedExpiresAtTimestamp);
  if (getValidDateTimestamp(expiresAt) === null) {
    throw new ReservationManagementSessionError(
      "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
    );
  }

  const payload: ReservationManagementSessionPayload = {
    v: 1,
    capabilityId: input.capabilityId,
    exp,
  };
  const payloadBase64url = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
  const signedContent = `v1.${payloadBase64url}`;
  const signature = createSignature(signedContent, secret).toString(
    "base64url",
  );

  return {
    value: `${signedContent}.${signature}`,
    expiresAt,
  };
}

export function verifyReservationManagementSession(
  value: unknown,
  now: Date = new Date(),
): VerifiedReservationManagementSession | null {
  const nowTimestamp = getValidDateTimestamp(now);
  if (nowTimestamp === null) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !value ||
    value.length > RESERVATION_MANAGEMENT_SESSION_MAX_LENGTH
  ) {
    return null;
  }

  const segments = value.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const [version, payloadBase64url, signatureBase64url] = segments;
  if (
    version !== "v1" ||
    !payloadBase64url ||
    !BASE64URL_PATTERN.test(payloadBase64url) ||
    !HMAC_SHA256_BASE64URL_PATTERN.test(signatureBase64url)
  ) {
    return null;
  }

  const payloadBytes = decodeCanonicalBase64url(payloadBase64url);
  const receivedSignature = decodeCanonicalBase64url(signatureBase64url);
  if (!payloadBytes || !receivedSignature) {
    return null;
  }

  const secret = getReservationManagementSecret();
  const expectedSignature = createSignature(
    `${version}.${payloadBase64url}`,
    secret,
  );

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadBytes.toString("utf8"));
  } catch {
    return null;
  }

  if (!isStrictPayload(parsedPayload)) {
    return null;
  }

  const expiresAtTimestamp = parsedPayload.exp * 1000;
  const sessionLimitTimestamp =
    nowTimestamp + RESERVATION_MANAGEMENT_SESSION_TTL_MS;
  if (
    !Number.isSafeInteger(expiresAtTimestamp) ||
    expiresAtTimestamp <= nowTimestamp ||
    !Number.isSafeInteger(sessionLimitTimestamp) ||
    expiresAtTimestamp > sessionLimitTimestamp
  ) {
    return null;
  }

  const expiresAt = new Date(expiresAtTimestamp);
  if (getValidDateTimestamp(expiresAt) === null) {
    return null;
  }

  return {
    capabilityId: parsedPayload.capabilityId,
    expiresAt,
  };
}
