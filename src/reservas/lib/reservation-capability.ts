import "server-only";

import { createHash, randomBytes } from "node:crypto";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const RESERVATION_CAPABILITY_EXPIRY_MARGIN_MS = 24 * 60 * 60 * 1000;
const RESERVATION_CAPABILITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

type ReservationCapabilityErrorCode =
  | "INVALID_RESERVATION_DATES"
  | "INVALID_RESERVATION_ID"
  | "RESERVATION_CAPABILITY_UNAVAILABLE";

class ReservationCapabilityError extends Error {
  readonly code: ReservationCapabilityErrorCode;

  constructor(code: ReservationCapabilityErrorCode) {
    super("Reservation capability operation failed.");
    this.name = "ReservationCapabilityError";
    this.code = code;
  }
}

export type RotateReservationCapabilityInput = {
  reservationId: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
};

export type ReservationCapabilityIssueResult = {
  capabilityId: string;
  token: string;
  expiresAt: Date;
};

export type ReservationCapabilityRevocationResult = {
  revokedCount: number;
  revokedAt: Date;
};

export type ReservationCapabilityLifecycle = {
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

function getValidDateTimestamp(value: Date): number | null {
  if (!(value instanceof Date)) {
    return null;
  }

  const timestamp = value.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function calculateReservationCapabilityExpiry(
  fechaHoraInicio: Date,
  fechaHoraFin: Date | null,
): Date {
  const startTimestamp = getValidDateTimestamp(fechaHoraInicio);
  const endTimestamp =
    fechaHoraFin === null
      ? startTimestamp
      : getValidDateTimestamp(fechaHoraFin);

  if (startTimestamp === null || endTimestamp === null) {
    throw new ReservationCapabilityError("INVALID_RESERVATION_DATES");
  }

  const expiresAt = new Date(
    Math.max(startTimestamp, endTimestamp) +
      RESERVATION_CAPABILITY_EXPIRY_MARGIN_MS,
  );

  if (!Number.isFinite(expiresAt.getTime())) {
    throw new ReservationCapabilityError("INVALID_RESERVATION_DATES");
  }

  return expiresAt;
}

function generateReservationCapabilityToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashReservationCapabilityTokenUnsafe(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidReservationCapabilityToken(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    RESERVATION_CAPABILITY_TOKEN_PATTERN.test(value)
  );
}

export function getReservationCapabilityTokenHash(
  value: unknown,
): string | null {
  if (!isValidReservationCapabilityToken(value)) {
    return null;
  }

  return hashReservationCapabilityTokenUnsafe(value);
}

export function isReservationCapabilityActive(
  capability: ReservationCapabilityLifecycle,
  now: Date = new Date(),
): boolean {
  if (capability.usedAt !== null || capability.revokedAt !== null) {
    return false;
  }

  const expiresAtTimestamp = getValidDateTimestamp(capability.expiresAt);
  const nowTimestamp = getValidDateTimestamp(now);

  return (
    expiresAtTimestamp !== null &&
    nowTimestamp !== null &&
    expiresAtTimestamp > nowTimestamp
  );
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function revokeActiveReservationCapabilitiesAt(
  tx: Prisma.TransactionClient,
  reservationId: string,
  now: Date,
): Promise<ReservationCapabilityRevocationResult> {
  const result = await tx.reservationCapability.updateMany({
    where: {
      reservationId,
      usedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      revokedAt: now,
    },
  });

  return {
    revokedCount: result.count,
    revokedAt: now,
  };
}

export async function revokeActiveReservationCapabilitiesInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
): Promise<ReservationCapabilityRevocationResult> {
  if (typeof reservationId !== "string" || !reservationId.trim()) {
    throw new ReservationCapabilityError("INVALID_RESERVATION_ID");
  }

  return revokeActiveReservationCapabilitiesAt(
    tx,
    reservationId.trim(),
    new Date(),
  );
}

export async function rotateReservationCapabilityInTx(
  tx: Prisma.TransactionClient,
  input: RotateReservationCapabilityInput,
): Promise<ReservationCapabilityIssueResult> {
  const now = new Date();
  const expiresAt = calculateReservationCapabilityExpiry(
    input.fechaHoraInicio,
    input.fechaHoraFin,
  );

  await revokeActiveReservationCapabilitiesAt(tx, input.reservationId, now);

  const token = generateReservationCapabilityToken();
  const tokenHash = hashReservationCapabilityTokenUnsafe(token);
  const capability = await tx.reservationCapability.create({
    data: {
      reservationId: input.reservationId,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
    },
  });

  return {
    capabilityId: capability.id,
    token,
    expiresAt,
  };
}

export async function reissueReservationCapability(
  reservationId: string,
): Promise<ReservationCapabilityIssueResult> {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const reservation = await tx.reservation.findUnique({
            where: {
              id: reservationId,
            },
            select: {
              id: true,
              fechaHoraInicio: true,
              fechaHoraFin: true,
            },
          });

          if (!reservation) {
            throw new ReservationCapabilityError(
              "RESERVATION_CAPABILITY_UNAVAILABLE",
            );
          }

          return rotateReservationCapabilityInTx(tx, {
            reservationId: reservation.id,
            fechaHoraInicio: reservation.fechaHoraInicio,
            fechaHoraFin: reservation.fechaHoraFin,
          });
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

  throw new Error("Reservation capability retry invariant failed.");
}
