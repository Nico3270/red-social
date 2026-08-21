"use server";

import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import {
  isReservationCapabilityActive,
  revokeActiveReservationCapabilitiesInTx,
} from "@/reservas/lib/reservation-capability";
import {
  getReservationManagementCookieClearOptions,
  getReservationManagementCookieName,
  verifyReservationManagementSession,
} from "@/reservas/lib/reservation-management-session";
import { Prisma, ReservationStatus } from "@prisma/client";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { cookies, headers } from "next/headers";

const RESERVATION_TIME_ZONE = "America/Bogota";
const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

export type CancelManagedReservationResult =
  | {
      ok: true;
      code: "RESERVATION_CANCELLED" | "RESERVATION_ALREADY_CANCELLED";
      message: string;
    }
  | {
      ok: false;
      code:
        | "RESERVATION_ACCESS_DENIED"
        | "RESERVATION_NOT_AVAILABLE"
        | "INTERNAL_ERROR";
      message: string;
    };

type CancellationNotification = {
  businessId: string;
  businessPhone: string | null;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
};

type ManagedCancellationTransactionResult =
  | {
      outcome: "cancelled";
      notification: CancellationNotification;
    }
  | {
      outcome: "already-cancelled" | "denied" | "not-available";
      notification: null;
    };

class ManagedCancellationInvariantError extends Error {
  constructor() {
    super("Managed reservation cancellation invariant failed.");
    this.name = "ManagedCancellationInvariantError";
  }
}

const RESULTS = {
  RESERVATION_CANCELLED: {
    ok: true,
    code: "RESERVATION_CANCELLED",
    message: "Tu reserva fue cancelada correctamente.",
  },
  RESERVATION_ALREADY_CANCELLED: {
    ok: true,
    code: "RESERVATION_ALREADY_CANCELLED",
    message: "Esta reserva ya fue cancelada.",
  },
  RESERVATION_ACCESS_DENIED: {
    ok: false,
    code: "RESERVATION_ACCESS_DENIED",
    message: "No se puede acceder a la gestión de esta reserva.",
  },
  RESERVATION_NOT_AVAILABLE: {
    ok: false,
    code: "RESERVATION_NOT_AVAILABLE",
    message: "Esta reserva ya no se puede cancelar.",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No pudimos procesar la cancelación. Inténtalo nuevamente.",
  },
} as const satisfies Record<
  CancelManagedReservationResult["code"],
  CancelManagedReservationResult
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

function getCanonicalOrigin(): string | null {
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

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function formatReservationInstant(date: Date): string {
  return formatInTimeZone(
    date,
    RESERVATION_TIME_ZONE,
    "d 'de' MMMM 'de' yyyy 'a las' h:mm a",
    { locale: es },
  );
}

async function notifyCancellationWithoutChangingCommittedResult(
  notification: CancellationNotification,
): Promise<void> {
  if (!notification.businessPhone) {
    return;
  }

  try {
    await notifyReservaConfirmadaCliente({
      to: notification.businessPhone,
      nombre_cliente: notification.customerName,
      telefono_cliente: notification.customerPhone,
      fechaHora: formatReservationInstant(notification.startsAt),
      template: PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO,
      negocioId: notification.businessId,
    });
  } catch {
    // La cancelación y el lifecycle de capabilities ya fueron confirmados.
  }
}

async function cancelWithinSerializableTransaction(
  capabilityId: string,
): Promise<ManagedCancellationTransactionResult> {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const capability = await tx.reservationCapability.findUnique({
            where: {
              id: capabilityId,
            },
            select: {
              id: true,
              expiresAt: true,
              usedAt: true,
              revokedAt: true,
              reservation: {
                select: {
                  id: true,
                  estado: true,
                  nombre: true,
                  telefono: true,
                  fechaHoraInicio: true,
                  negocio: {
                    select: {
                      id: true,
                      telefonoContacto: true,
                    },
                  },
                },
              },
            },
          });

          if (!capability) {
            return {
              outcome: "denied",
              notification: null,
            };
          }

          const reservation = capability.reservation;

          if (capability.revokedAt !== null) {
            return {
              outcome: "denied",
              notification: null,
            };
          }

          if (capability.usedAt !== null) {
            return reservation.estado === ReservationStatus.CANCELADA
              ? {
                  outcome: "already-cancelled",
                  notification: null,
                }
              : {
                  outcome: "denied",
                  notification: null,
                };
          }

          if (
            !isReservationCapabilityActive(
              {
                expiresAt: capability.expiresAt,
                usedAt: capability.usedAt,
                revokedAt: capability.revokedAt,
              },
              now,
            )
          ) {
            return {
              outcome: "denied",
              notification: null,
            };
          }

          if (reservation.estado === ReservationStatus.COMPLETADA) {
            await revokeActiveReservationCapabilitiesInTx(tx, reservation.id);
            return {
              outcome: "not-available",
              notification: null,
            };
          }

          if (
            reservation.estado !== ReservationStatus.PENDIENTE &&
            reservation.estado !== ReservationStatus.CONFIRMADA
          ) {
            return {
              outcome: "denied",
              notification: null,
            };
          }

          const capabilityClaim = await tx.reservationCapability.updateMany({
            where: {
              id: capability.id,
              usedAt: null,
              revokedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              usedAt: now,
            },
          });

          if (capabilityClaim.count !== 1) {
            throw new ManagedCancellationInvariantError();
          }

          const reservationUpdate = await tx.reservation.updateMany({
            where: {
              id: reservation.id,
              estado: {
                in: [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA],
              },
            },
            data: {
              estado: ReservationStatus.CANCELADA,
            },
          });

          if (reservationUpdate.count !== 1) {
            throw new ManagedCancellationInvariantError();
          }

          await revokeActiveReservationCapabilitiesInTx(tx, reservation.id);

          return {
            outcome: "cancelled",
            notification: {
              businessId: reservation.negocio.id,
              businessPhone: reservation.negocio.telefonoContacto,
              customerName: reservation.nombre,
              customerPhone: reservation.telefono,
              startsAt: reservation.fechaHoraInicio,
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

  throw new ManagedCancellationInvariantError();
}

type ManagementCookieStore = Awaited<ReturnType<typeof cookies>>;

function clearManagementCookie(cookieStore: ManagementCookieStore): void {
  try {
    cookieStore.set(
      getReservationManagementCookieName(),
      "",
      getReservationManagementCookieClearOptions(),
    );
  } catch {
    // La limpieza no cambia el resultado ya decidido por el boundary.
  }
}

export async function cancelManagedReservation(): Promise<CancelManagedReservationResult> {
  const canonicalOrigin = getCanonicalOrigin();
  if (!canonicalOrigin) {
    return RESULTS.INTERNAL_ERROR;
  }

  let requestOrigin: string | null;
  try {
    const headerStore = await headers();
    requestOrigin = headerStore.get("origin");
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  if (!requestOrigin) {
    return RESULTS.RESERVATION_ACCESS_DENIED;
  }

  if (requestOrigin !== canonicalOrigin) {
    return RESULTS.RESERVATION_ACCESS_DENIED;
  }

  let cookieStore: ManagementCookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  const cookieValue = cookieStore.get(
    getReservationManagementCookieName(),
  )?.value;
  if (!cookieValue) {
    return RESULTS.RESERVATION_ACCESS_DENIED;
  }

  let managementSession;
  try {
    managementSession = verifyReservationManagementSession(
      cookieValue,
      new Date(),
    );
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  if (!managementSession) {
    clearManagementCookie(cookieStore);
    return RESULTS.RESERVATION_ACCESS_DENIED;
  }

  let transactionResult: ManagedCancellationTransactionResult;
  try {
    transactionResult = await cancelWithinSerializableTransaction(
      managementSession.capabilityId,
    );
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  if (transactionResult.outcome === "cancelled") {
    await notifyCancellationWithoutChangingCommittedResult(
      transactionResult.notification,
    );
    clearManagementCookie(cookieStore);
    return RESULTS.RESERVATION_CANCELLED;
  }

  clearManagementCookie(cookieStore);

  if (transactionResult.outcome === "already-cancelled") {
    return RESULTS.RESERVATION_ALREADY_CANCELLED;
  }

  if (transactionResult.outcome === "not-available") {
    return RESULTS.RESERVATION_NOT_AVAILABLE;
  }

  return RESULTS.RESERVATION_ACCESS_DENIED;
}
