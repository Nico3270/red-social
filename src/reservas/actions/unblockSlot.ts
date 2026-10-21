"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { ReservationStatus, Role } from "@prisma/client";
import * as z from "zod";

const unblockSlotSchema = z
  .object({
    reservationId: z.string().trim().min(1),
  })
  .strict();

type UnblockSlotErrorCode =
  | "UNAUTHENTICATED"
  | "RESERVATION_ACCESS_DENIED"
  | "RESERVATION_NOT_AVAILABLE"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR";

type UnblockSlotResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: UnblockSlotErrorCode;
      message: string;
    };

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
    message: "El bloqueo no está disponible para esta acción.",
  },
  INVALID_INPUT: {
    ok: false,
    code: "INVALID_INPUT",
    message: "Los datos para desbloquear el intervalo no son válidos.",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible desbloquear el intervalo.",
  },
} as const satisfies Record<UnblockSlotErrorCode, UnblockSlotResult>;

export async function unblockSlot(data: unknown): Promise<UnblockSlotResult> {
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

  const parsed = unblockSlotSchema.safeParse(data);
  if (!parsed.success) {
    return ERROR_RESPONSES.INVALID_INPUT;
  }

  try {
    const deletedCount = await prisma.$transaction(async (tx) => {
      const result = await tx.reservation.deleteMany({
        where: {
          id: parsed.data.reservationId,
          negocioId: ownerBusinessId,
          estado: ReservationStatus.BLOQUEADA,
        },
      });

      return result.count;
    });

    if (deletedCount !== 1) {
      return ERROR_RESPONSES.RESERVATION_ACCESS_DENIED;
    }

    return {
      ok: true,
      message: "Intervalo desbloqueado exitosamente.",
    };
  } catch {
    return ERROR_RESPONSES.INTERNAL_ERROR;
  }
}
