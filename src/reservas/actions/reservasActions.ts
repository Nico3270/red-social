"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import * as z from "zod";
import { notifyReservaConfirmadaCliente } from "../helpers/notifyReserva";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";
import { revokeActiveReservationCapabilitiesInTx } from "../lib/reservation-capability";
import { Prisma, ReservationStatus, Role } from "@prisma/client";

// Interface compartida para respuestas estandarizadas (elegante y reusable)
interface ActionResponse {
  ok: boolean;
  message: string;
}

type ChangeStatusErrorCode =
  | "UNAUTHENTICATED"
  | "RESERVATION_ACCESS_DENIED"
  | "RESERVATION_NOT_AVAILABLE"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR";

type ChangeStatusResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: ChangeStatusErrorCode;
      message: string;
    };

function formatearFecha(fechaInput?: string | Date): string {
  if (!fechaInput){
    return "La fecha no esta disponible"
  }
  const fechaObj = new Date(fechaInput);

  const fechaStr = fechaObj.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const horaStr = fechaObj.toLocaleTimeString("es-ES", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  return `${fechaStr} a las ${horaStr}`;
}

// Schema para validación de changeStatusReservations
const changeStatusSchema = z
  .object({
    negocioId: z.string().trim().min(1, "ID del negocio requerido"),
    reservaId: z.string().trim().min(1, "ID de la reserva requerido"),
    nuevoStatus: z.enum([
      ReservationStatus.PENDIENTE,
      ReservationStatus.CONFIRMADA,
      ReservationStatus.CANCELADA,
      ReservationStatus.COMPLETADA,
    ]),
  })
  .strict();

const CHANGE_STATUS_MAX_ATTEMPTS = 3;

class ChangeStatusBoundaryError extends Error {
  readonly code: "RESERVATION_ACCESS_DENIED" | "RESERVATION_NOT_AVAILABLE";

  constructor(code: "RESERVATION_ACCESS_DENIED" | "RESERVATION_NOT_AVAILABLE") {
    super("Reservation status operation failed.");
    this.name = "ChangeStatusBoundaryError";
    this.code = code;
  }
}

const CHANGE_STATUS_ERRORS = {
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
    message: "Los datos para cambiar el estado no son válidos.",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible cambiar el estado de la reserva.",
  },
} as const satisfies Record<ChangeStatusErrorCode, ChangeStatusResponse>;

// Server Action legacy: exportada temporalmente, pero completamente inerte.
export async function deleteReserva(data: unknown): Promise<ActionResponse> {
  void data;
  return {
    ok: false,
    message: "La eliminación directa de reservas ya no está disponible.",
  };
}

type StatusChangeTransactionResult = {
  changed: boolean;
  reservation: {
    id: string;
    estado: ReservationStatus;
    nombre: string;
    telefono: string;
    fechaHoraInicio: Date;
  };
};

function isTerminalReservationStatus(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.CANCELADA ||
    status === ReservationStatus.COMPLETADA
  );
}

function isSerializableStatusConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function changeStatusWithinSerializableTransaction(
  ownerBusinessId: string,
  reservationId: string,
  newStatus: ReservationStatus,
): Promise<StatusChangeTransactionResult> {
  for (let attempt = 1; attempt <= CHANGE_STATUS_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const reservation = await tx.reservation.findFirst({
            where: {
              id: reservationId,
              negocioId: ownerBusinessId,
            },
            select: {
              id: true,
              estado: true,
              nombre: true,
              telefono: true,
              fechaHoraInicio: true,
            },
          });

          if (!reservation) {
            throw new ChangeStatusBoundaryError("RESERVATION_ACCESS_DENIED");
          }

          if (reservation.estado === ReservationStatus.BLOQUEADA) {
            throw new ChangeStatusBoundaryError("RESERVATION_NOT_AVAILABLE");
          }

          if (reservation.estado === newStatus) {
            return {
              changed: false,
              reservation,
            };
          }

          if (isTerminalReservationStatus(reservation.estado)) {
            throw new ChangeStatusBoundaryError("RESERVATION_NOT_AVAILABLE");
          }

          const updated = await tx.reservation.update({
            where: {
              id: reservation.id,
            },
            data: {
              estado: newStatus,
            },
            select: {
              id: true,
              estado: true,
              nombre: true,
              telefono: true,
              fechaHoraInicio: true,
            },
          });

          if (isTerminalReservationStatus(newStatus)) {
            await revokeActiveReservationCapabilitiesInTx(tx, updated.id);
          }

          return {
            changed: true,
            reservation: updated,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        isSerializableStatusConflict(error) &&
        attempt < CHANGE_STATUS_MAX_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Reservation status retry invariant failed.");
}

async function notifyCancellationWithoutChangingCommittedResult(
  input: Parameters<typeof notifyReservaConfirmadaCliente>[0],
): Promise<void> {
  try {
    await notifyReservaConfirmadaCliente(input);
  } catch {
    // El estado y la revocación de capabilities ya fueron confirmados.
  }
}

// Server Action: cambiar exclusivamente el estado de una reserva del owner.
export async function changeStatusReservations(
  data: unknown,
): Promise<ChangeStatusResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return CHANGE_STATUS_ERRORS.UNAUTHENTICATED;
  }

  const ownerBusinessId =
    typeof session.user.negocioId === "string"
      ? session.user.negocioId.trim()
      : "";
  if (session.user.role !== Role.negocio || !ownerBusinessId) {
    return CHANGE_STATUS_ERRORS.RESERVATION_ACCESS_DENIED;
  }

  const parsed = changeStatusSchema.safeParse(data);
  if (!parsed.success) {
    return CHANGE_STATUS_ERRORS.INVALID_INPUT;
  }

  let committed: StatusChangeTransactionResult;
  try {
    committed = await changeStatusWithinSerializableTransaction(
      ownerBusinessId,
      parsed.data.reservaId,
      parsed.data.nuevoStatus,
    );
  } catch (error) {
    if (error instanceof ChangeStatusBoundaryError) {
      return CHANGE_STATUS_ERRORS[error.code];
    }

    return CHANGE_STATUS_ERRORS.INTERNAL_ERROR;
  }

  if (
    committed.changed &&
    committed.reservation.estado === ReservationStatus.CANCELADA &&
    committed.reservation.telefono
  ) {
    await notifyCancellationWithoutChangingCommittedResult({
      to: committed.reservation.telefono,
      nombre_cliente: committed.reservation.nombre,
      fechaHora: formatearFecha(committed.reservation.fechaHoraInicio),
      template: PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO,
      negocioId: ownerBusinessId,
    });
  }

  return {
    ok: true,
    message: committed.changed
      ? `Estado cambiado a ${committed.reservation.estado} exitosamente.`
      : `La reserva ya se encuentra en estado ${committed.reservation.estado}.`,
  };
}

// Schema para bloquear
const blockSchema = z.object({
  negocioId: z.string().min(1),
  fechaHoraInicio: z.string(), // ISO
  fechaHoraFin: z.string(),
});


// Opcional: Schema para validar reservaData (para más seguridad)
const reservaSchema = z.object({
  nombre: z.string(),
  telefono: z.string(),
  fechaHoraInicio: z.date(),
  fechaHoraFin: z.date(),
  notas: z.string(),
  estado: z.literal('BLOQUEADA'),  // Fuerza solo 'BLOQUEADA' para este caso
  negocioId: z.string(),
  usuarioId: z.string().nullable(),
});

export async function blockSlot(data: unknown): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id) return { ok: false, message: "No autenticado" };

  const parsed = blockSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  const { negocioId, fechaHoraInicio, fechaHoraFin } = parsed.data;
  // console.log({ negocioId, fechaHoraInicio, fechaHoraFin });

  try {
    // Verificación de ownership
    const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
    // console.log("Negocio encontrado:", negocio);
    if (!negocio || negocio.id !== session.user.negocioId) {
      return { ok: false, message: "No tienes permiso para bloquear en este negocio" };
    }

    // Prepara y valida reservaData
    const reservaData = {
      nombre: "Bloqueado",
      telefono: "N/A",
      fechaHoraInicio: new Date(fechaHoraInicio),
      fechaHoraFin: new Date(fechaHoraFin),
      notas: "Bloqueo manual",
      estado: ReservationStatus.BLOQUEADA,
      negocioId,
      usuarioId: session.user.id || null,
    };
    reservaSchema.parse(reservaData);  // Validación opcional con Zod
    // console.log("Intentando crear reserva con data:", reservaData);

    // Crea reserva
    const createdReserva = await prisma.reservation.create({
      data: reservaData,
    });
    console.log("Reserva creada exitosamente:", createdReserva);

    return { ok: true, message: "Slots bloqueados exitosamente" };
  } catch (error) {
    console.error("Error detallado en blockSlot:", error);
    return { ok: false, message: "Error al bloquear: " + (error instanceof Error ? error.message : "Desconocido") };
  }
}
